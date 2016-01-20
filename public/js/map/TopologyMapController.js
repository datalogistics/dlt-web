function topologyMapController($scope, $routeParams, $http, UnisService) {
  //TODO: Maybe move graph-loading stuff to the server (like download tracking data) so the UNIS instance isn't hard-coded
  var topoUrl = "http://dev.incntre.iu.edu:8889/domains/" 
  if ($routeParams.domain) {topoUrl = topoUrl + $routeParams.domain}
    
    
  //var topoUrl = "http://dev.incntre.iu.edu:8889/domains/domain_al2s.net.internet2.edu"
  //var topoUrl = "http://dev.incntre.iu.edu:8889/domains/domain_es.net"
  var svg = d3.select("#topologyMap").append("svg")
               .attr("width", 1200)
               .attr("height", 500)

  var map = null
  if ($routeParams.geo) {map = geoMap("#topoplogyMap", 960, 500, svg)}
  else if ($routeParams.circle) {map = circleMap("#topologyMap", 960, 500, svg)}//TODO: Circular (pack) layout
  else {map = forceMap("#topologyMap", 1200, 500, svg);}

  var baseGraph = domainsGraph(UnisService)
  var graph = expandGraph(baseGraph, [])

  map.doDraw(map, graph)
  
  //Cleanup functions here!
  $scope.$on("$destroy", function() {d3.selectAll("#map-tool-tip").each(function() {this.remove()})})  //Cleanup the tooltip object when you navigate away
}

function expandGraph(graph, paths) {
  //Just the selected nodes

  paths = paths.map(p => p.trim()).filter(p => p.length > 0)
  var expansion = paths.length == 0
                   ? [graph.root]
                   : paths.map(path => expandPath(graph.root, path.split(":")))
                       .reduce((acc, partial) => acc.concat(partial), [])


  //Rebuild links to fit just selected nodes
  var links = graph.links
                 .map(link => {return {source: findEndpoint(expansion, link.source),
                                       sink: findEndpoint(expansion, link.sink)}})
                 .filter(link => link.source != link.sink)

  return {nodes: expansion, links: links}
}

function findEndpoint(expansion, target) {
  var matchLen = function(a,b) {
    for(i=0; i<a.length && i<b.length; i++) {
      if (a[i] != b[i]) {return i-1}
    }
    return Math.min(a.length, b.length)
  }

  var bestMatch = expansion.reduce(
    function (acc, node, i) {
      var match = matchLen(target, node.path)
      if (match >= acc.matchLen) {return {matchLen: match, idx: i}}
      return acc
    },
    {matchLen: 0, idx: -1})

  return bestMatch.idx
}

function expandPath(root, path) {
   if (path.length == 0) {return [root]}
   var target = (path[0] != "*")
                 ? root.children.filter(child => child.id == path[0])
                 : root.children
  
   //copy path and remove first item
   path = path.map(e=>e)
   path.shift() 

   return target.map(child => expandPath(child, path))
                .reduce((acc, item) => {return acc.concat(item)}, [])
}

// Graph is pair of nodes and links
// Nodes is a tree
// links is a list of pairs of paths in the tree
function domainsGraph(UnisService) {
  var ports = UnisService.ports 
                .map(port => {var values = URNtoDictionary(port.urn)
                              values["selfRef"] = port.selfRef
                              values["id"] = values.port
                              return values})

  var nodes = UnisService.nodes
                  .map(n => {return {id: n.id, location: n.location, selfRef: n.selfRef, children: n.ports ? n.ports.map(p => p.href) : []}})
                  .map(n => {n.children = ports.filter(p => n.children.indexOf(p.selfRef) >= 0); return n})

  var domains = UnisService.domains
                  .map(d => {return {id: d.id, children: d.nodes.map(n => n.href)}})
                  .map(d => {d.children = nodes.filter(n => d.children.indexOf(n.selfRef) >= 0); return d})

  var usedNodes = domains.reduce((acc, domain) => acc.concat(domain.children), [])
  domains.push({id: "other", children: nodes.filter(n => usedNodes.indexOf(n) < 0)})
  var root = {id: "root", children: domains}
  addPaths(root, "")

  var pathMapping = portToPath(domains).reduce((acc, pair) => {acc[pair.ref] = pair.path; return acc}, {})
  var links = UnisService.links
                  .map(l => {return {source: pathMapping[l.endpoints.source.href], 
                                     sink: pathMapping[l.endpoints.sink.href]}})
                  .filter(l => l.source && l.sink) //TODO: Remove this and actually resolve URN-based links...

  var graph = {root: root, links: links}
  return graph
}

function URNtoDictionary(urn) {
  return urn.split(":").map(p => p.split("="))
            .filter(p => p.length > 1) 
            .reduce((dict, pair) => {dict[pair[0]] = pair[1]; return dict}, {})
}

function addPaths(root, prefix) {
  var separator = ":"
  root["path"] = prefix
  if (root.children) {root.children.forEach(child => addPaths(child, prefix + separator + root.id))}
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

//Ensures a node with the given id exists in the node list.  
//Uses the 3rd "defaults" paramter to build a new one if it does not
function ensureNode(nodes, node, defaults) {
   defaults.parent   = (defaults.parent   === undefined) ? null           : defaults.parent
   defaults.children = (defaults.children === undefined) ? []             : defaults.children
   defaults.homeDomain = (defaults.homeDomain === undefined) ? undefined  : defaults.homeDomain
   defaults.id = node
   
   if (!nodes[node]) {nodes[node] = defaults}
   return nodes[node]
}

//Ensure that a node is in the nodes list.  Add it with the given parent if it is not.
function ensureNodes(nodes, link, defaults) {
  ensureNode(nodes, link.source, defaults)
  ensureNode(nodes, link.sink, defaults)
}


// ---------------- Spring force embedded -----

//Setup a spring-force embedding.
//
//selector -- used to grab an element of the page and append svg into into it
//width -- how wide to make the canvas
//height -- how tall to make the canvas 
//svg -- svg element to use (overrides selector is present) 
//returns the root element and a function for layout 
function forceMap(selector, width, height, svg) {
  if (svg === undefined) {
    svg = d3.select(selector).append("svg")
               .attr("width", width)
               .attr("height", height)
  }

  var map = svg.append("g")
               .attr("id", "map")
               .attr("width", width)
               .attr("height", height)
  
  var layout = d3.layout.force()
      .size([width, height])
      .linkDistance(function(l) {return l.source.homeDomain && l.target.homeDomain ? 40 : 20})
      .linkStrength(function(l) {return l.source.homeDomain && l.target.homeDomain ? 1 : .5})
      .charge(function(n) {return -100*n.weight})

  return {svg:map, layout: layout, doDraw:forceDraw}
}

function forceDraw(map, graph) {
  var svg = map.svg
  var layout = map.layout
  
  var nodes = Array.from(Object.keys(graph.nodes))
  var links = graph.links.map(l => {return {source: nodes.indexOf(l.source), target: nodes.indexOf(l.sink)}})
                         .filter(l => l.source != l.target)
  
  layout.nodes(nodes.map(e => {return {id: e, details: graph.nodes[e]}}))
  layout.links(links)
  layout.start()
  
  var colors = d3.scale.category10()
  var networkDomains = Array.from(layout.nodes().reduce((acc, n) => {n.details.domains.forEach(d => acc.add(d)); return acc}, new Set()))
  colors.domain(networkDomains)
  var legend = svg.append("g")
                  .attr("class", "legend")
                  .attr("transform", "translate(15,10)")
  legend = legend.selectAll(".circle").data(networkDomains)
  legend.enter().append("circle")
        .attr("class", "legend-item")
        .attr("r", 8)
        .attr("cx", 0)
        .attr("cy", (d,i) => i*25)
        .attr("fill", d => colors(d))
  legend.enter().append("text")
        .attr("class", "legend-label")
        .attr("x", 10)
        .attr("y", (d,i) => i*25+5)
        .text(d => d)


  var node = svg.selectAll(".node").data(layout.nodes())
  var link = svg.selectAll(".link").data(layout.links())

  node.enter().append("circle").attr("class", "node")
  link.enter().append("line").attr("class", "link")

  layout.on("tick", function(e) {
    node.attr("name", function(d) {return d.id})
        .attr("cx", function(d) {return d.x})
        .attr("cy", function(d) {return d.y})
        .attr("r", function(d) {return d.details.homeDomain ? 10 : 5})
        .attr("level", function(d) {return d.details.level})
        .attr("visibility", "hidden")
        .call(layout.drag)
        .attr("fill", function(d) {
            if(d.details.domains.size > 1 && d.details.homeDomain === undefined) {return "gray"}
            if(d.details.domains.size == 0) {return "red"}
            var domain =d.details.domains.values().next().value //Just one entry, gets it out
            var base = colors(domain)
            if (d.details.homeDomain) {base = d3.rgb(base).brighter();}
            return base
        })

    link.attr("x1", function(d) {return d.source.x})
        .attr("y1", function(d) {return d.source.y})
        .attr("x2", function(d) {return d.target.x})
        .attr("y2", function(d) {return d.target.y})
        .style("stroke", "gray")

     svg.selectAll('[level="domain_entry"]').attr("visibility", "visible")
  })
  tooltip(svg, "circle.node")
  return map
}

// ------------------------- Circular embedding -------------------------
function circleDraw(map, graph) {
  var svg = map.svg
  var width = map.width
  var height = map.height

  var nodes = Array.from(Object.keys(graph.nodes)).map(e => {return {id: e}})
  var angularSpacing = (Math.PI*2)/nodes.length
  var layoutX = (r, i) => (r*Math.cos(i * angularSpacing) + (width/2))
  var layoutY = (r, i) => (r*Math.sin(i * angularSpacing) + (height/2))
  nodes = nodes.map((e,i) => {e["x"] = layoutX(80, i); return e})
               .map((e,i) => {e["y"] = layoutY(80, i); return e})

  var layout = {}
  nodes.forEach(e => layout[e.id] = e)

  var node = svg.selectAll(".node").data(nodes)
  node.enter().append("circle")
    .attr("class", "node")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("id", d => d.id)
    .attr("r", 5)

  var link = svg.selectAll(".link").data(graph.links)
  link.enter().append("line")
     .attr("class", "link")
     .attr("x1", d => layout[d.source].x)
     .attr("y1", d => layout[d.source].y) 
     .attr("x2", d => layout[d.sink].x)
     .attr("y2", d => layout[d.sink].y) 
     .attr("stroke", "gray")


}

function circleMap(selector, width, height, svg) {
  if (svg === undefined) {
    svg = d3.select(selector).append("svg")
               .attr("width", width)
               .attr("height", height)
  }

  var map = svg.append("g")
               .attr("id", "map")
               .attr("width", width)
               .attr("height", height)
  
  return {svg:map, width: width, height: height, doDraw: circleDraw}
}

