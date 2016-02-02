var PATH_SEPARATOR = ":"
var SANITARY = ":"  //TODO: USE THIS....and it cannot be the same as PATH_SEPARATOR

function topologyMapController($scope, $routeParams, $http, UnisService) {
  //TODO: Maybe move graph-loading stuff to the server (like download tracking data) so the UNIS instance isn't hard-coded
  var paths = $routeParams.paths ? [].concat($routeParams.paths) : ["root"] //Pass multiple paths like ?path=*&path=*:*
  var width = 1200
  var height = 500
    
    
  var svg = d3.select("#topologyMap").append("svg")
               .attr("width", width)
               .attr("height", height)

  var draw
  $routeParams.layout = $routeParams.layout ? $routeParams.layout.toLowerCase() : ""
  if ($routeParams.layout == "circle") {draw = circleDraw}
  else if ($routeParams.layout == "blackhole") {draw = blackholeDraw}
  else if ($routeParams.layout == "icicle") {draw = icicleDraw}
  else if ($routeParams.layout == "circletree") {draw = treeDraw}
  else if ($routeParams.layout == "force") {draw = forceDraw}
  else {draw = blackholeDraw}

  var baseGraph = domainsGraph(UnisService)
  var graph = subsetGraph(baseGraph, paths)
  var group = basicSetup(svg, width, height)

  draw(graph, group, width, height, expandNode)

  function expandNode(d, i) {
    //TODO: Burn things to the ground is not the best strategy...go for animated transitions (eventaully) with ._children/.children
    //TODO: Preserve inner selection: filter the paths sent to to subset to only those with their parent in the paths (changes the add/remove logic)
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
    draw(graph, group, width, height, expandNode)
  }
  
  //Cleanup functions here!
  $scope.$on("$destroy", function() {d3.selectAll("#map-tool-tip").each(function() {this.remove()})})  //Cleanup the tooltip object when you navigate away
}

function subsetGraph(graph, paths) {
  //Just the selected nodes
                        
  var subTree = trimTree(graph.root, paths) 
  var leaves = gatherLeaves(subTree)

  //Rebuild links to fit just selected nodes
  var links = graph.links
                 .map(link => {return {source: findEndpoint(leaves, link.source),
                                       sink: findEndpoint(leaves, link.sink)}})
                 .filter(link => link.source != link.sink)

  return {tree: subTree, links: links}
}

function sanitize(string) {return string.replace("SANITARY", ":SAN:").replace(PATH_SEPARATOR, ":SEP:")}

//How many segments between A and B match?
function pathMatch(a,b) {
    var aParts = a.split(PATH_SEPARATOR)
    var bParts = b.split(PATH_SEPARATOR)
    for(i=0; i<aParts.length && i<bParts.length; i++) {
      if (aParts[i] != bParts[i]) {return i} 
    }
    return Math.min(aParts.length, bParts.length)
}

function findEndpoint(expansion, target) {
  var bestMatch = expansion.reduce(
    function (acc, node, i) {
      var match = pathMatch(target, node.path)
      if (match >= acc.matchLen) {return {matchLen: match, idx: i}}
      return acc
    },
    {matchLen: 0, idx: -1})

  return target.split(PATH_SEPARATOR).slice(0, bestMatch.matchLen).join(PATH_SEPARATOR)
}

//root -- root of tree
//paths -- paths as arrays of strings
function trimTree(root, paths) {
  var filterTree = function(tree) {
    var children = tree.children
    if (children) {
      children = tree.children.filter(c => c.__keep__).map(filterTree)
    }
    tree._children = tree.children
    tree.children = (children && children.length > 0) ? children : undefined
    return tree
  }

  paths = paths.map(p => p.trim()).filter(p => p.length > 0)
  var tagged;
  if (paths.length == 0) {
    root = shallowClone(root)
    root["children"] = undefined
    tagged = root
  } else {
    tagged = paths.reduce(
              function(acc, path) {
                return tagPath(acc, path.split(PATH_SEPARATOR))
              }, root)
  }

  return filterTree(tagged)
}

//root -- root of tree
//path -- path as array of nodes
function tagPath(root, path) {
   root = shallowClone(root)
   root["__keep__"] = true

   var target = path[0]
   if (path.length == 0) {return root}
   if (target != root.id) {return root}

   var rest = path.slice(1, path.length)
   if (root.children) {root.children = root.children.map(child => tagPath(child, rest))}
   return root
}

function pathToIndex(path, nodes) {return nodes.map(e => e.path).indexOf(path)}

// Gather up just the leaf nodes of a tree
function gatherLeaves(root) {
  if (root.children) {
    return root.children
              .map(child => gatherLeaves(child))
              .reduce((acc, node) => {return acc.concat(node)}, [])

  } else {
    return [root]
  }
}

function shallowClone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
}

//Ensures that an SVG group context exists
function basicSetup(svg, width, height) {
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


//Adds a "domain" field to each node
//Returns a function that colors by domain!
function domainColors(nodes, svg, x,y) {
  function removeGray(colors) {
    return colors.filter(c => c.substring(1,3) != c.substring(3,5) || c.substring(1,3) != c.substring(5,7))
  }

  nodes = nodes.map(n => {n["domain"] = n.path.split(PATH_SEPARATOR)[1]; return n})
  var domains = nodes.map(n => n.domain)
                            .filter(d => d && d.trim().length >0)
                            .reduce((acc, d) => {acc.add(d); return acc}, new Set())
  domains = Array.from(domains)
  domains.sort()
  var base = d3.scale.category10().domain(domains)
  base.range(removeGray(base.range()))
  var fn = function(v) {
    if (!v || v.trim() == "" || v.trim() == "other") {return "gray"}
    return base(v.trim())
  }

  if (svg) {
    var legend = svg.append("g")
                    .attr("class", "legend")
                    .attr("transform", "translate(" + x + "," + y + ")")
    legend = legend.selectAll(".circle").data(domains)
    legend.enter().append("circle")
          .attr("class", "legend-item")
          .attr("r", 8)
          .attr("cx", 0)
          .attr("cy", (d,i) => i*25)
          .attr("fill", fn)
    legend.enter().append("text")
          .attr("class", "legend-label")
          .attr("x", 10)
          .attr("y", (d,i) => i*25+5)
          .text(d => d)
  }

  return {fn: fn, nodes: nodes}
}

// ---------------- Spring force embedded -----
function forceDraw(graph, svg, width, height, nodeClick) {
  var layout = d3.layout.force()
      .size([width, height])
      .linkDistance(function(l) {return 15})
      .linkStrength(function(l) {return .75})
      .charge(function(n) {return -100*n.weight})

  var nodes = gatherLeaves(graph.tree).map(n => shallowClone(n))
  var links = graph.links
               .filter(l => l.source != l.sink)
               .map(l => {return {source: pathToIndex(l.source, nodes), target: pathToIndex(l.sink, nodes)}})

  layout.nodes(nodes.map(e => {return {id: e.id, details: e}}))
  layout.links(links)
  layout.start()

  var colors = domainColors(nodes, svg, 10, 15)
  nodes = colors.nodes

  var node = svg.selectAll(".node").data(layout.nodes())
  var link = svg.selectAll(".link").data(layout.links())

  node.enter().append("circle").attr("class", "node")
  link.enter().append("line").attr("class", "link")

  layout.on("tick", function(e) {
    node.attr("name", d => d.id)
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("fill", d => colors.fn(d.details.domain))
        .attr("r", 5)
        .call(layout.drag)
        .on("click", nodeClick)

    link.attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y)
        .style("stroke", "gray")
  })
  tooltip(svg, "circle.node")
  return map
}

// ------------------------- Circular embedding -------------------------
function circleDraw(graph, svg, width, height, nodeClick) {
  var nodes = gatherLeaves(graph.tree).map(n => shallowClone(n))
  var colors = domainColors(nodes, svg, 10, 15)
  nodes = colors.nodes

  var angularSpacing = (Math.PI*2)/nodes.length
  var layoutX = (r, i) => (r*Math.cos(i * angularSpacing) + (width/2))
  var layoutY = (r, i) => (r*Math.sin(i * angularSpacing) + (height/2))
  nodes = nodes.map((e,i) => {e["x"] = layoutX(150, i); return e})
               .map((e,i) => {e["y"] = layoutY(150, i); return e})

  var layout = {}
  nodes.forEach(e => layout[e.path] = e)

  var node = svg.selectAll(".node").data(nodes)
  node.enter().append("circle")
    .attr("class", "node")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("name", d => d.id)
    .attr("fill", d => colors.fn(d.domain))
    .attr("r", 5)
    .on("click", nodeClick)
    
  var links = graph.links.filter(l => l.source != l.sink)

  var link = svg.selectAll(".link").data(links)
  link.enter().append("line")
     .attr("class", "link")
     .attr("x1", d => layout[d.source].x)
     .attr("y1", d => layout[d.source].y) 
     .attr("x2", d => layout[d.sink].x)
     .attr("y2", d => layout[d.sink].y) 
     .attr("stroke", "gray")

  tooltip(svg, "circle.node")
  return map
}

// ------------------------- Circular Tree Embedding -------------------------
function treeDraw(graph, svg, width, height, nodeClick) {
  var diameter = width/2
  var pad = 50

  var tree = svg.append("g").attr("transform", "translate(" + (diameter/2 + 100) + ", " + diameter/2 + ")")

  var layout = d3.layout.tree()
                  .children(n => n.children ? n.children : [])
                  .size([360, diameter/2-pad])
                  .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });

  var diagonal = d3.svg.diagonal.radial()
    .projection(function(d) { return [d.y, d.x / 180 * Math.PI]; });
  
  var nodes = layout.nodes(graph.tree)
  var treelinks = layout.links(nodes)

  var colors = domainColors(nodes, svg, 10, 15)
  nodes = colors.nodes

  var graphLinks = graph.links
               .filter(l => l.source != l.sink)
               .map(l => {return {source: nodes[pathToIndex(l.source, nodes)], target: nodes[pathToIndex(l.sink, nodes)]}})
               .map(l => {return {source: toCartesian(l.source.y, (l.source.x-90)*(Math.PI/180)),
                                  target: toCartesian(l.target.y, (l.target.x-90)*Math.PI/180)}})

   var graphlink = tree.append("g").attr("id", "graph-links")
         .selectAll(".graph-link").data(graphLinks)
         .enter().append("path")
           .attr("d", d => arc(d.source, d.target))
           .attr("class", "graph-link")
           .attr("fill-opacity", "0")
           .attr("stroke-width", ".5")
           .attr("stroke", "blue")


  var treelink = tree.append("g").attr("id", "tree-links")
      .selectAll(".tree-link").data(treelinks)
      .enter().append("path")
        .attr("class", "tree-link")
        .attr("stroke-width", ".5") 
        .attr("stroke", "gray")
        .attr("fill", "white")
        .attr("fill-opacity", "0")
        .attr("d", diagonal);

  var node = tree.append("g").attr("id", "nodes")
      .selectAll(".node").data(nodes)
        .enter().append("g")
        .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; })

  node.append("circle")
      .attr("r", 4.5)
      .attr("fill", d => colors.fn(d.domain))
      .attr("class", "node")
      .attr("name", d => d.id)
      .on("click", nodeClick)
  tooltip(svg, "circle.node")
  return map
}

//Two arguments: radius, angleInRadians
//One Argument: [radius, angleInRadians]
//One ARgument: {r: radius, t: angleInRadians}
function toCartesian(radius, angleInRadians) {
  if (!angleInRadians) {
    if (radius[0]) {
      angleInRadians = radius[1]
      radius = radius[0]
    } else {
      angleInRadians = radius.t
      radius = radius.r
    }
  }

  return {
    x: (radius * Math.cos(angleInRadians)),
    y: (radius * Math.sin(angleInRadians))
  };
}

//Two arguments: x,y 
//One Argument: [x,y]
//One ARgument: {x: x, y: y}
function toPolar(x,y) {
  if (!y) {
    if (x[0]) {
      y=x[1]
      x=x[0]
    } else {
      y=x.y
      x=x.x
    }
  }
  return {r: Math.sqrt(x*x+y*y), t: Math.atan2(y,x)}
}

//Return a path between (source.x, source.y) and (target.x, target.y)
//Based on http://stackoverflow.com/questions/17156283/d3-js-drawing-arcs-between-two-points-on-map-from-file
//pct_w and pct_h are used as percent offsets (defaulting to 0) 
function arc(source, target, pct_w, pct_h) {
  pct_w = pct_w ? pct_w : 0
  pct_h = pct_h ? pct_h : 0
  
  var sx = source.x + (pct_w * (source.dx ? source.dx : 0)),
      sy = source.y + (pct_h * (source.dy ? source.dy : 0)),
      tx = target.x + (pct_w * (target.dx ? target.dx : 0)),
      ty = target.y + (pct_h * (target.dy ? target.dy : 0))

  var dx = tx - sx,
      dy = ty - sy,
      dr = Math.sqrt(dx * dx + dy * dy);
  

  return "M" + sx + "," + sy + "A" + dr + "," + dr +
        " 0 0,0 " + tx + "," + ty;
}


// ------------------ Black Hole --------------
// Like a sunburst, but inward instead of outward
function circularMean(items) {
  var sums = items.reduce(function (acc, c) {
      var polar = toPolar(c[0], c[1])
      return {r: acc.r + polar.r, ts: acc.ts+Math.sin(polar.t), tc: acc.tc+Math.cos(polar.t)}
    }, {r:0, ts:0, tc: 0})
  
  var avg = {r: sums.r/items.length, 
             t: Math.atan2(sums.ts/items.length, sums.tc/items.length)}
  return avg;
}

//Sort the nodes array so the link distance is minized
//Probably not a metric TSP solution because we don't treat the nodes list as circular
function reduceEnergy(nodes, links) {
  function energy(items) {
    return links.filter(l => pathToIndex(l.source, items) >= 0 && pathToIndex(l.sink, items) >=0)
                .map(l => {return {source: pathToIndex(l.source, items), target: pathToIndex(l.sink, items)}})
                .reduce((acc, link) => (acc + Math.abs(link.source - link.target)), 0)
  }
  //Swaps i and j in a copy of the array
  function swap(arr, i, j) {
    var copy = arr.slice()
    var tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
    return copy
  }

  function betterOrder(original, i, j) {
    var copy = swap(original.array, i ,j)
    var swp = energy(copy)
    if (swp < original.energy) {return {array: copy, energy: swp}}
    return original 
  }
  
   var best = {array: nodes, energy: energy(nodes)}
   var changed = true
   while (changed) {
     changed = false
     for (var i=0; i<best.array.length-1; i++) {
       var post = betterOrder(best, i, i+1)
       changed = changed || (post.energy != best.energy)
       best = post
     }
   }
   return best.array
}

function reduceTreeEnergy(tree, links) {
  if (tree.children) {
    tree = shallowClone(tree)
    tree.children = reduceEnergy(tree.children, links).map(c => reduceTreeEnergy(c, links))
                       .map((n,i) => {n.sort = i; return n}) 
  } 
  return tree
}

function blackholeDraw(graph, svg, width, height, nodeClick) {
  var radius = Math.min(width, height) / 2
 
  var partition = d3.layout.partition()
      .sort(null)
      //.sort((a,b) => a.sort - b.sort)
      .size([2 * Math.PI, radius])
      .value(d => d._children ? d._children.length : 1)

 
  //console.log(reduceTreeEnergy(graph.tree, graph.links))
  //var nodes = partition.nodes(reduceTreeEnergy(graph.tree, graph.links))
  var nodes = partition.nodes(graph.tree)
  var colors = domainColors(nodes, svg, 10, 15)
  nodes = colors.nodes
  var maxDepth = nodes.reduce((acc, n) => Math.max(n.depth, acc), 0)
 
  svg = svg.append("g").attr("transform", "translate(" + width / 2 + "," + height * .52 + ")")

  var arc = d3.svg.arc()
      .startAngle(d => d.x)
      .endAngle(d => d.x + d.dx)
      .innerRadius(d => radius - (radius/(maxDepth+5))*(d.depth-1))
      .outerRadius(d => radius - (radius/(maxDepth+5))*d.depth)
 
  svg.append("g").attr("id", "nodes").selectAll("path")
       .data(nodes)
     .enter().append("path")
       .attr("class", "node")
       .attr("name", d => d.id)
       .attr("display", function(d) { return d.depth ? null : "none"; }) // hide inner ring
       .attr("d", arc)
       .style("stroke", "#fff")
       .attr("fill", d => colors.fn(d.domain))
       .style("fill-rule", "evenodd")
       .on("click", nodeClick)
 
  //LINKS
  arc.innerRadius(d => radius - (radius/(maxDepth+5))*d.depth)
  nodes = nodes.map(n => {n["centroid"] = toPolar(arc.centroid(n)); return n})
  var minR = nodes.reduce((acc, n) => Math.min(acc, n.centroid.r), width)

  nodes = nodes.map(n => {
    if (n.children) {
      n["center"] = {t: n.centroid.t, r: (minR/maxDepth)*n.depth} //Move to a level
    } else {
      n["center"] = n.centroid 
    }
    return  n
  }).map(n => {
      return n
  })

  var graphLinks = graph.links
               .filter(l => l.source != l.sink)
               .map((l,i) => {return {source: nodes[pathToIndex(l.source, nodes)], target: nodes[pathToIndex(l.sink, nodes)]}})
 
  var bundle = d3.layout.bundle()

  var line = d3.svg.line()
              .interpolate("bundle")
              .tension(.85)
              .x(d => toCartesian(d.center).x)
              .y(d => toCartesian(d.center).y)

  var link = svg.append("g").attr("id", "links").selectAll(".graph-link").data(bundle(graphLinks))
  link.enter().append("path")
     .attr("class", "graph-link")
     .attr("d", line)
     .attr("fill-opacity", "0")
     .attr("stroke-width", "1")
     .attr("stroke", "gray")
  
  tooltip(svg, "path.node")  //TODO: Need a different way to find "where is this" for the arcs, 
  
  var link = svg.append("g").attr("id", "P").selectAll("rect").data(nodes)
  link.enter().append("rect")
    .attr("x", d => toCartesian(d.center).x-2.5)
    .attr("y", d => toCartesian(d.center).y-2.5)
    .attr("id", d => d.id)
    .attr("polar", d => d.center)
    .attr("width", 5)
    .attr("height", 5)
    .attr("fill", "red")
}
// ------------------ Icicle --------------
function icicleDraw(graph, svg, space_width, height, nodeClick) {
  width = space_width-200
  height = 200
  var partition = d3.layout.partition()
      .sort(null)
      .size([width, height])
      .value(function(d) { return 1; });
 
  var nodes = partition.nodes(graph.tree)
  var colors = domainColors(nodes, svg, 10, 15)
  nodes = colors.nodes
  svg = svg.append("g").attr("transform", "translate(" + (space_width-width) + "," + 0 + ")")

  rect = svg.selectAll("rect")
    .data(nodes)
  .enter().append("rect")
    .attr("class", "node")
    .attr("name", d => d.id)
    .attr("x", d => d.x)
    .attr("y", d => d.y)
    .attr("width", d => d.dx)
    .attr("height", d => d.dy)
    .attr("fill", d => colors.fn(d.domain))
  .on("click", nodeClick)

  var graphLinks = graph.links
               .filter(l => l.source != l.sink)
               .map(l => {return {source: nodes[pathToIndex(l.source, nodes)], target: nodes[pathToIndex(l.sink, nodes)]}})
               .map(l => {return l.source.x <= l.target.x ? l : {source: l.target, target: l.source}})

  var graphlink = svg.append("g").attr("id", "graph-links")
         .selectAll(".graph-link").data(graphLinks)
         .enter().append("path")
           .attr("d", d => arc(d.source, d.target, .5, 1))
           .attr("class", "graph-link")
           .attr("fill-opacity", "0")
           .attr("stroke-width", ".5")
           .attr("stroke", "blue")
           .attr("pointer-events", "none")

  tooltip(svg, "rect.node")
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
  root["path"] = prefix + root.id 
  if (root.children) {root.children.forEach(child => addPaths(child, root["path"] + PATH_SEPARATOR))}
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
