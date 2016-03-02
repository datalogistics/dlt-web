function measurementTopologyController($scope, $routeParams, $http, UnisService) {
  var PATH_SEPARATOR = ":"

  var paths = $routeParams.paths ? [].concat($routeParams.paths) : ["root"] //Pass multiple paths multiple path-entries in the query string 
  paths = paths.map(p => p.startsWith("root:") ? p : "root:" + p)

  var width = 1200
  var height = 500
    
  var svg = d3.select("#topologyMap").append("svg")
               .attr("width", width)
               .attr("height", height)

  var draw
  $routeParams.layout = $routeParams.layout ? $routeParams.layout.toLowerCase() : ""
  if ($routeParams.layout == "circle") {draw = circleDraw}
  else if ($routeParams.layout == "spoke") {draw = spokeDraw}
  else if ($routeParams.layout == "blackhole") {draw = blackholeDraw}
  else {draw = blackholeDraw}

  var baseGraph = setOrder(domainsGraph(UnisService))

  var graph = subsetGraph(baseGraph, paths)
  var group = basicSetup(svg, width, height)
  var selection = []

  var mouseClick = clickBranch(expandNode, selectNode)
  draw(graph, selection, group, width, height, mouseClick)

  function expandNode(d, i) {
    //TODO: Burn things to the ground is not the best strategy...go for animated transitions (eventaully) with ._children/.children
    //TODO: Preserve inner selection: filter the paths sent to to subset to only those with their parent in the paths (changes the add/remove logic)
    //TODO: Add an alt-click to expand all?
    if (!d._children) {return} 
    var targetParts = d.path.split(PATH_SEPARATOR)
    var newPaths = paths.filter(path => !(path == d.path
                                         || (pathMatch(path, d.path) == targetParts.length)))
    if (newPaths.length == paths.length) {
      newPaths = paths
      newPaths.push(d.path)
    }
    paths = newPaths
    var graph = subsetGraph(baseGraph, paths) 
    group.selectAll("*").remove()
    draw(graph, selection, group, width, height, mouseClick)
  }

  function selectNode(d, i) {
    //TODO: Heirarchy aware selection? For example: Select grabs all children or selected child that is collapsed is shown as semi-selected parent?
    var key = d.path 
    var at = selection.indexOf(key)
    if (at < 0) {selection.push(key)}
    else {selection.splice(at, 1)}
    var graph = subsetGraph(baseGraph, paths) 
    group.selectAll("*").remove()
    draw(graph, selection, group, width, height, mouseClick)
  }
  
  //Cleanup functions here!
  $scope.$on("$destroy", function() {d3.selectAll("#map-tool-tip").each(function() {this.remove()})})  //Cleanup the tooltip object when you navigate away


  // --------------- Utilities to load domain data from UNIS ---------------
  // Graph is pair of nodes and links
  // Nodes is a tree
  // links is a list of pairs of paths in the tree
  function domainsGraph(UnisService) {
    var ports = UnisService.ports 
                  .map(port => {var values = URNtoDictionary(port.urn)
                                values["selfRef"] = port.selfRef
                                values["id"] = port.name 
                                return values})
                  .filter(Boolean)  // Filters out 'falsy' values, undefined is one of them

    var nodes = UnisService.nodes
                    .map(n => {return {id: n.id, location: n.location, selfRef: n.selfRef, children: n.ports ? n.ports.map(p => p.href) : []}})
                    .map(n => {n.children = ports.filter(p => n.children.indexOf(p.selfRef) >= 0); return n})

    var domains = UnisService.domains
                    .map(d => {return {id: d.id, children: d.nodes.map(n => n.href)}})
                    .map(d => {d.children = nodes.filter(n => d.children.indexOf(n.selfRef) >= 0); return d})
                    .map(d => {d.id = d.id.startsWith("domain_") ? d.id.substring("domain_".length) : d.id; return d})

    //Fill in the unknown domain/node parts on ports
    domains.forEach(domain => 
         domain.children.forEach(node =>
            node.children.forEach(port => {
                 if (!port.domain) {port["domain"] = domain.id}
                 if (!port.node) {port["node"] = node.id}
            })))

    var usedNodes = domains.reduce((acc, domain) => acc.concat(domain.children), [])
    var root = {id: "root", children: domains}
    
    var links = UnisService.links
                   .map(link => {
                     if (link.directed) {
                       return {source: link.endpoints.source.href, 
                               sink: link.endpoints.sink.href}
                     } else {
                       return {source: link.endpoints[0].href, 
                               sink: link.endpoints[1].href}
                     }})
    
    var badlinks = links.filter(l => !l.source || !l.sink)
    if (badlinks.length > 0) {console.error("Problematic links dropped for missing source or sink: ", badlinks.length)}

    links.reduce((acc, link) => {
              if (link.source.startsWith("urn")) {acc.push(link.source)}
              if (link.sink.startsWith("urn")) {acc.push(link.sink)}
              return acc}, [])
        .forEach(endpoint => ensureURNNode(endpoint, root))

    addPaths(root, "")

    var pathMapping = portToPath(domains).reduce((acc, pair) => {acc[pair.ref] = pair.path; return acc}, {})
    links = links.map(link => {return {source: pathMapping[link.source.href], 
                                       sink: pathMapping[link.sink.href]}})

    links = links.filter(l => l.source && l.sink) 

    var graph = {root: root, links: links}
    return graph
  }

  function URNtoDictionary(urn) {
    var parts = urn.split(":")
    if (urn.indexOf("=") > 0) {
      return parts.map(p => p.split("="))
                .filter(p => p.length > 1) 
                .reduce((dict, pair) => {dict[pair[0]] = pair[1]; return dict}, {})
    } else if (parts.length >= 5) {
      var result = {}
      result["domain"] = parts[3]
      result["node"] = parts[4]
      result["port"] = parts[5]
      return result
    } else {
      //console.log("Returning empty dictionary. Could not create plausible URN dictionary for: " + urn)
      return {} 
    }
  }

  function addPaths(root, prefix) {
    root["path"] = prefix + root.id 
    if (root.children) {root.children.forEach(child => addPaths(child, root["path"] + PATH_SEPARATOR))}
  }

  function ensureURNNode(urn, root) {
    var parts = URNtoDictionary(urn)
    if (!parts || !parts.domain || !parts.node || !parts.port) {
      console.log("Could not ensure endpoint", urn); return;
    }
    
    var domain = root.children.filter(domain => domain.id == parts.domain)
    if (domain.length == 0) {
      domain = {id: parts.domain, children: [], synthetic: true}
      root.children.push(domain)
    } else {domain = domain[0]}

    var node = domain.children.filter(node => node.id == parts.node)
    if (node.length == 0) {
      var node = {id: parts.node, children: [], synthetic: true}
      domain.children.push(node)
    } else {node = node[0]}

    var port = node.children.filter(port => port.id == parts.port)
    if (port.length == 0) {
      var port = {id: parts.port, selfRef: urn, synthetic: true}
      node.children.push(port) 
    }
  }


  function portToPath(root) {
    return root.reduce(function(acc, entry) {
      if (entry.children) {
        acc = acc.concat(portToPath(entry.children))
      } else {
        acc.push({ref: entry.selfRef, path: entry.path})
      }
      return acc
    },
    [])
  }
}
