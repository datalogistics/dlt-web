function topologyMapController($scope, $routeParams, $http, UnisService) {
  //TODO: Maybe move graph-loading stuff to the server (like download tracking data) so the UNIS instance isn't hard-coded
  var topoUrl = "http://dev.incntre.iu.edu:8889/domains/" 
  if ($routeParams.domain) {topoUrl = topoUrl + $routeParams.domain}
  var paths = $routeParams.paths ? [].concat($routeParams.paths) : ["*:*"] //Pass multiple paths like ?path=*&path=*:*
    
    
  //var topoUrl = "http://dev.incntre.iu.edu:8889/domains/domain_al2s.net.internet2.edu"
  //var topoUrl = "http://dev.incntre.iu.edu:8889/domains/domain_es.net"
  var svg = d3.select("#topologyMap").append("svg")
               .attr("width", 1200)
               .attr("height", 500)

  var map = null
  if ($routeParams.layout == "circle") {map = circleLayout(svg, 960, 500)}
  else if ($routeParams.layout == "tree") {map = treeLayout(svg, 960, 500)}
  else {map = forceLayout(svg, 1200, 500);}

  var baseGraph = domainsGraph(UnisService)
  var graph = subsetGraph(baseGraph, paths)

  map.doDraw(map, graph)
  
  //Cleanup functions here!
  $scope.$on("$destroy", function() {d3.selectAll("#map-tool-tip").each(function() {this.remove()})})  //Cleanup the tooltip object when you navigate away
}

function subsetGraph(graph, paths) {
  //Just the selected nodes
                        
  var expansion = expandPaths(graph.root, paths) 
  //Rebuild links to fit just selected nodes
  var links = graph.links
                 .map(link => {return {source: findEndpoint(expansion, link.source),
                                       sink: findEndpoint(expansion, link.sink)}})
                 .filter(link => link.source != link.sink)

  var subTree = toTree(expansion) 

  return {nodes: subTree, links: links}
}

//Uses path data to rebuild a tree based on a list of nodes
function toTree(root, nodes) {
  function ensurePath(tree, path) {
    path.map(
      function (tree, id) {
        var point = tree.children.filter(child => child.id == id)
        if (point.length == 0) {
          point = {id: point, children: []}
          tree.children.push(point)
        }
      })}

  function findParent(tree, path) {
    return path.reduce((parent, id) => parent.children.filter(child => child.id == point), tree)
  }

  return nodes.reduce(
            function (tree, node) {
              var path = node.path.split(":")
              ensurePath(tree, path.slice(0, path.length-1))
              var parent = findParent(tree, path.slice(0, path.length-1))
              parent.children.push(node)
              return tree
            }, {id: "root", children: []})
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

  return target.substring(0, bestMatch.matchLen)
}

function expandPaths(root, paths) {
  paths = paths.map(p => p.trim()).filter(p => p.length > 0)
  return paths.length == 0
           ? [root]
           : paths.map(path => expandPath(root, path.split(":")))
               .reduce((acc, partial) => acc.concat(partial), [])
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

function pathToIndex(path, nodes) {
  return nodes.map(e => e.path).indexOf(path)
}

// Gather up just the leaf nodes of a tree
function leaves(root) {
  if (root.children) {
    return root.children
              .map(child => flatten(child))
              .reduce((acc, node) => {acc.push(node); return acc}, [])

  } else {
    return [root]
  }
}

function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
    }
    return copy;
}

//Ensures that an SVG group context exists
function basicSetup(width, height, svg) {
  if (svg === undefined) {
    svg = d3.select("html").append("svg")
               .attr("width", width)
               .attr("height", height)
  }

  var group = svg.append("g")
               .attr("id", "map")
               .attr("width", width)
               .attr("height", height)
  
  return group 
}

// ---------------- Spring force embedded -----

//Setup a spring-force embedding.
//
//width -- how wide to make the canvas
//height -- how tall to make the canvas 
//svg -- svg element to use (overrides selector is present) 
//returns the root element and a function for layout 
function forceLayout(svg, width, height) {
  var group = basicSetup(width, height, svg)
  var layout = d3.layout.force()
      .size([width, height])
      .linkDistance(function(l) {return 15})
      .linkStrength(function(l) {return .75})
      .charge(function(n) {return -100*n.weight})

  return {group: group, layout: layout, doDraw:forceDraw}
}

function forceDraw(map, graph) {
  var svg = map.group
  var layout = map.layout

  var nodes = graph.nodes.map(n => clone(n)).map(n => {n["domain"] = n.path.split(":")[2]; return n})
  var links = graph.links
               .filter(l => l.source != l.sink)
               .map(l => {return {source: pathToIndex(l.source, nodes), target: pathToIndex(l.sink, nodes)}})

  layout.nodes(nodes.map(e => {return {id: e.id, details: e}}))
  layout.links(links)
  layout.start()
  
  var networkDomains = nodes.map(n => n.domain)
                            .reduce((acc, d) => {acc.add(d); return acc}, new Set())
  networkDomains = Array.from(networkDomains)

  var colors = d3.scale.category10().domain(networkDomains)

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
    node.attr("name", function(d) {
      return d.id})
        .attr("cx", function(d) {return d.x})
        .attr("cy", function(d) {return d.y})
        .attr("r", function(d) {return 5})
        .attr("fill", d => colors(d.details.domain))
        .call(layout.drag)

    link.attr("x1", function(d) {return d.source.x})
        .attr("y1", function(d) {return d.source.y})
        .attr("x2", function(d) {return d.target.x})
        .attr("y2", function(d) {return d.target.y})
        .style("stroke", "gray")
  })
  tooltip(svg, "circle.node")
  return map
}

// ------------------------- Circular embedding -------------------------
function circleDraw(map, graph) {
  var svg = map.group
  var width = map.width
  var height = map.height

  var nodes = graph.nodes.map(e => {return {id: e.id, details: e}})
  var angularSpacing = (Math.PI*2)/nodes.length
  var layoutX = (r, i) => (r*Math.cos(i * angularSpacing) + (width/2))
  var layoutY = (r, i) => (r*Math.sin(i * angularSpacing) + (height/2))
  nodes = nodes.map((e,i) => {e["x"] = layoutX(150, i); return e})
               .map((e,i) => {e["y"] = layoutY(150, i); return e})

  var layout = {}
  nodes.forEach(e => layout[e.details.path] = e)

  var node = svg.selectAll(".node").data(nodes)
  node.enter().append("circle")
    .attr("class", "node")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("id", d => d.id)
    .attr("r", 5)
  
    
  var links = graph.links.filter(l => l.source != l.sink)

  var link = svg.selectAll(".link").data(links)
  link.enter().append("line")
     .attr("class", "link")
     .attr("x1", d => layout[d.source].x)
     .attr("y1", d => layout[d.source].y) 
     .attr("x2", d => layout[d.sink].x)
     .attr("y2", d => layout[d.sink].y) 
     .attr("stroke", "gray")
}

function circleLayout(svg, width, height) {
  var group = basicSetup(width, height, svg)
  return {group:group, width: width, height: height, doDraw: circleDraw}
}

// ------------------------- Tree embedding -------------------------
function treeDraw(map, graph) {
  var svg = map.group
  var width = map.width
  var height = map.height

  var layout = d3.layout.tree()

}


function treeLayout(svg, width, height) {
  var group = basicSetup(width, height, svg)
  return {group: group, width: width, height: height, doDraw: treeDraw}
}




// --------------- Utilities to load domain data from UNIS ---------------
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
                  .map(d => {d.id = d.id.startsWith("domain_") ? d.id.substring("domain_".length) : d.id; return d})

  var usedNodes = domains.reduce((acc, domain) => acc.concat(domain.children), [])
  domains.push({id: "other", children: nodes.filter(n => usedNodes.indexOf(n) < 0)})
  var root = {id: "root", children: domains}
  
  UnisService.links //Ensure URN nodes...
         .reduce((acc, link) => {
            if (link.endpoints.source.href.startsWith("urn")) {acc.push(link.endpoints.source.href)}
            if (link.endpoints.sink.href.startsWith("urn")) {acc.push(link.endpoints.sink.href)}
            return acc
         }, [])
         .map(endpoint => ensureURNNode(endpoint, root))
  addPaths(root, "")

  var pathMapping = portToPath(domains).reduce((acc, pair) => {acc[pair.ref] = pair.path; return acc}, {})
  var links = UnisService.links
                 .map(l => {return {source: pathMapping[l.endpoints.source.href], 
                                     sink: pathMapping[l.endpoints.sink.href]}})
                 .filter(l => l.source && l.sink) 

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
    throw "Could not create plausible URN dictionary for: " + urn
  }
}

function addPaths(root, prefix) {
  var separator = ":"
  root["path"] = prefix + separator + root.id
  if (root.children) {root.children.forEach(child => addPaths(child, prefix + separator + root.id))}
}

function ensureURNNode(urn, root) {
  var parts = URNtoDictionary(urn)
  if (!parts.domain || !parts.node || !parts.port) {
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

