function topologyMapController($scope, $routeParams, $http, UnisService) {
  var PATH_SEPARATOR = ":"

  var rootFilter = $routeParams.root ? $routeParams.root : undefined
  var paths = $routeParams.paths ? [].concat($routeParams.paths) : ["root"] //Pass multiple paths multiple path-entries in the query string 
  paths = paths.map(p => p.startsWith("root:") ? p : "root:" + p)

  var width = 1200
  var height = 500
    
  var svg = d3.select("#topologyMap").append("svg")
               .attr("width", width)
               .attr("height", height)

  var layout = $routeParams.layout ? $routeParams.layout.toLowerCase() : ""
  var baseGraph = setOrder(unisGraph(UnisService, rootFilter))
  //baseGraph = fakeLinks(baseGraph, 3)

  draw(baseGraph, "__top__", paths, svg, layout, width, height)

  var group = basicSetup(svg, width, height)
  var selection = []
  
  //Cleanup functions here!
  //TODO: Move into topology tools...
  $scope.$on("$destroy", function() {d3.selectAll("#map-tool-tip").each(function() {this.remove()})})  //Cleanup the tooltip object when you navigate away


  // --------------- Utilities to load domain data from UNIS ---------------
  // Graph is pair of nodes and links
  // Nodes is a tree
  // links is a list of pairs of paths in the tree


  function unisGraph(UnisService, rootFilter) {
    var ports = UnisService.ports 
                  .map(port => {return {id: port.id, selfRef: port.selfRef, name: port.name}})
                  .filter(Boolean)  // Filters out 'falsy' values, undefined is one of them

    var nodes = UnisService.nodes
                    .map(e => {return {id: e.id, name: e.name, location: e.location, selfRef: e.selfRef, children: e.ports ? e.ports.map(p => cannonicalURL(p.href)) : []}})
                    .map(e => {e.children = ports.filter(p => e.children.indexOf(cannonicalURL(p.selfRef)) >= 0); return e})

    var domains = UnisService.domains
                    .map(e => {return {id: e.id, name: e.name, selfRef: e.selfRef, children: e.nodes ? e.nodes.map(n => n.href) : []}})
                    .map(e => {e.children = nodes.filter(n => e.children.indexOf(n.selfRef) >= 0); return e})

    var topologies = UnisService.topologies
                    .map(e => {return {id: e.id, name: e.name, selfRef: e.selfRef, children: e.domains ? e.domains.map(n => n.href) : []}})
                    .map(e => {e.children = domains.filter(d => e.children.indexOf(d.selfRef) >= 0); return e})
    
    var root = {id: "root", name: "root", children: topologies}
    addPaths(root, "")
    topologies.push(buildUnnamedTopology(domains, nodes, ports))

    if (rootFilter) {
      //TODO: Extend so it finds the root in topos or domains
      topologies = topologies.filter(t => t.id == rootFilter)
      topologies = topologies.length == 1 ? topologies[0].children : topologies
      root.children = topologies
    } 
    addPaths(root, "")

    var links
    links = UnisService.links
                   .map(link => {
                     if (link.directed) {
                       return {source: link.endpoints.source.href, 
                               sink: link.endpoints.sink.href}
                     } else {
                       return {source: link.endpoints[0].href, 
                               sink: link.endpoints[1].href}
                     }})
    
    var badlinks = links.filter(l => !validLinks(l))
    links = links.filter(validLinks)
    if (badlinks.length > 0) {console.error("Problematic links dropped for missing source or sink: ", badlinks.length, "\n", badlinks, "\nRetaining " + links.length)}

    links.reduce((acc, link) => {
              if (link.source.startsWith("urn")) {acc.push(link.source)}
              if (link.sink.startsWith("urn")) {acc.push(link.sink)}
              return acc}, [])
        .forEach(endpoint => ensureURNNode(endpoint, root))


    var pathMapping = HREF2Path(topologies)
    links = links.map(link => {return {source: pathMapping[cannonicalURL(link.source)], 
                                       sink: pathMapping[cannonicalURL(link.sink)]}})

    var badlinks = links.filter(l => !l.source || !l.sink)
    links = links.filter(l => l.source && l.sink)
    if (badlinks.length > 0) {console.error("Problematic links dropped for missing source or sink: ", badlinks.length, "\n", badlinks, "\nRetaining " + links.length)}

    var graph = {tree: root, links: links}
    return graph

    function validLinks(link) {
      //TODO: Improve...this is weak link validation...but at least its something
      return link.source && link.sink
              && (link.source.startsWith("urn") || link.source.startsWith("http"))
              && (link.sink.startsWith("urn") || link.sink.startsWith("http"))
    }

    function cannonicalURL(url) {return decodeURIComponent(url.replace(/\+/g, ' '))}

    function addPaths(root, prefix, top) {
      root["path"] = prefix + root.id 
      root["__top__"] = top 
      if (root.children) {
        root.children.forEach(child => {
          top = root["name"] === "root" ? child["description"] || child["name"] || child["id"] : top
          addPaths(child, root["path"] + PATH_SEPARATOR, top) 
        })
      }
    }

    function buildUnnamedTopology(domains, node, ports) {
      var unnamed_topo = {id: -1, name: "---", selfRef: "##unnamed_topology##"}
      var unnamed_domain = {id: -1, name: "---", selfRef: "##unnamed_domain##"}
      var unnamed_node = {id: -1, name: "---", selfRef: "##unnamed_node##"}

      unnamed_topo["children"] = domains.filter(d => d.path === undefined)
      unnamed_domain["children"] = nodes.filter(d => d.path === undefined)
      unnamed_node["children"] = ports.filter(d => d.path === undefined)

      if (unnamed_node.children.length >0) {unnamed_domain.children.push(unnamed_node)}
      if (unnamed_domain.children.length >0) {unnamed_topo.children.push(unnamed_node)}
      if (unnamed_topo.children.length > 0) {return unnamed_topo;}
      return 
    }

    function ensureURNNode(urn, root) {
      var parts = URNtoDictionary(urn)
      if (!parts || !parts.domain || !parts.node || !parts.port) {
        console.error("Could not ensure endpoint", urn); return;
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

    function HREF2Path(root) {
      function gather(root) {
        //Build a dictionary that maps hrefs to tree paths
        return listing = root.reduce(function(acc, entry) {
          if (entry.children) {acc = acc.concat(gather(entry.children))}
          acc.push({ref: entry.selfRef, path: entry.path})
          return acc
        },
        [])
      }
      var listing = gather(root);
      return listing.reduce((acc, pair) => {acc[cannonicalURL(pair.ref)] = pair.path; return acc}, {})
    }
  }

}
