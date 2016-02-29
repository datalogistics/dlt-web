var PATH_SEPARATOR = ":"
var SANITARY = ":"  //TODO: USE THIS....and it cannot be the same as PATH_SEPARATOR

function topologyMapController($scope, $routeParams, $http, UnisService) {
  //TODO: Maybe move graph-loading stuff to the server (like download tracking data) so the UNIS instance isn't hard-coded
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
    if (at <0) {selection.push(key)}
    else {selection.splice(at, 1)}
    var graph = subsetGraph(baseGraph, paths) 
    group.selectAll("*").remove()
    draw(graph, selection, group, width, height, mouseClick)
  }
  
  //Cleanup functions here!
  $scope.$on("$destroy", function() {d3.selectAll("#map-tool-tip").each(function() {this.remove()})})  //Cleanup the tooltip object when you navigate away
}

//Dispatcher for click events based on key press.  
//Lets the events be defined separately.
function clickBranch(none, shift) {
  return function(d,i) {
    if (d3.event.shiftKey) {return shift(d,i)}
    return none(d,i)
  }
}

function setOrder(graph) {
  //Set an order for children
  function linkCount(node) {
    var pathLen = node.path.split(PATH_SEPARATOR).length
    var ins = graph.links.map(l => l.source).filter(l => pathMatch(l, node.path)==pathLen).length
    var outs = graph.links.map(l => l.sink).filter(l => pathMatch(l, node.path)==pathLen).length
    return ins+outs
  }

  function orderChildren(tree) {
    if (tree.children) {
      tree = shallowClone(tree)
      tree.children = tree.children.map(orderChildren)
      tree.children.map(n => {n.links = linkCount(n); return n})
      tree.children.sort((a,b) => a.links - b.links)
      tree.children.forEach((n, i) => {n.sort = i; return n})
      return tree
    }
    return shallowClone(tree)
  }
  return {root: orderChildren(graph.root), links: graph.links}
}

function subsetGraph(graph, paths) {
  //Retain just items in the selected paths and their immediate children
                        
  var subTree = trimTree(graph.root, paths) 
  var leaves = gatherLeaves(subTree)

  //Rebuild links to fit just selected nodes
  var links = graph.links
                 .map(link => {return {source: findEndpoint(leaves, link.source),
                                       sink: findEndpoint(leaves, link.sink)}})
                 .filter(link => link.source != link.sink)

  return {tree: subTree, links: links}
}

function pathMatch(a,b) {
  //How many segments between A and B match?
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

function trimTree(root, paths) {
  //root -- root of tree
  //paths -- paths to keep as arrays of strings
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


// ------------------------- Nested Circular Embedding -------------------------
function circleDraw(graph, selection,  svg, width, height, nodeClick) {
  function layoutGroup(group, center, outer_radius, layout) {
      //Per: http://www.had2know.com/academics/inner-circular-ring-radii-formulas-calculator.html
    //Alternative if this prooves too wasteful: https://en.wikipedia.org/wiki/Circle_packing_in_a_circle
    var member_radius = outer_radius*Math.sin(Math.PI/group.length)/(1+Math.sin(Math.PI/group.length))
    var inner_radius = outer_radius - member_radius

    var angularSpacing = (Math.PI*2)/group.length
    var layoutX = (r, i) => (r*Math.cos(i * angularSpacing) + center.x)
    var layoutY = (r, i) => (r*Math.sin(i * angularSpacing) + center.y)
    group.forEach((e,i) => 
                  layout[e.path] = {
                    x: layoutX(inner_radius, i), 
                    y: layoutY(inner_radius,i), 
                    r: member_radius*.9,
                    node: e
                  })
    return layout 
  }

  function layoutTree(root, center, radius, layout) {
    if (root.children) {
      layoutGroup(root.children, center, radius, layout)

      root.children.forEach(n => {
        var c = {x: layout[n.path].x, y:layout[n.path].y}
        var r = layout[n.path].r
        layoutTree(n, c, r, layout) 
      }) 
    }
    return layout
  }

  var layout = layoutTree(graph.tree, {x: width/2, y: height/2+20}, width/4, {})
 
  var nodes = Object.keys(layout).map(k => layout[k].node)
  var colors = domainColors(nodes, svg, 10, 15)
  nodes = colors.nodes

  var node = svg.selectAll(".tree-node").data(nodes)
  node.enter().append("circle")
    .attr("class", "tree-node")
    .attr("cx", d => layout[d.path].x)
    .attr("cy", d => layout[d.path].y)
    .attr("name", d => d.id)
    .attr("path" , d=> d.path)
    .attr("fill", d => colors.fn(d.domain))
    .attr("stroke", "black")
    .attr("stroke-width", 2)
    .attr("r",  d => layout[d.path].r)
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
  

// ------------------ Black Hole --------------
// Like a sunburst, but inward instead of outward


function circularMean(items) {
  //Mid-point for things arranged around a circle
  //https://en.wikipedia.org/wiki/Mean_of_circular_quantities
  var sums = items.reduce(function (acc, c) {
      var polar = toPolar(c[0], c[1])
      return {r: acc.r + polar.r, ts: acc.ts+Math.sin(polar.t), tc: acc.tc+Math.cos(polar.t)}
    }, {r:0, ts:0, tc: 0})
  
  var avg = {r: sums.r/items.length, 
             t: Math.atan2(sums.ts/items.length, sums.tc/items.length)}
  return avg;
}

function cross(list) {
  //All pairs in a list of unique items (does not include self links)
  //So [a,b,c] => [[a,b], [a,c], [b,c]]
  var crossed = []
  for(var i=0; i<list.length; i++) {
    for (j=i+1; j<list.length; j++) {
      crossed.push([list[i], list[j]])
    }
  }
  return crossed
}

function blackholeDraw(graph, selection, svg, width, height, nodeClick) {
  function showId(svg, enter) {
    if (enter) {
      return function(item) {
        svg.text(item.id)
           .attr("x", d3.mouse(this)[0])
           .attr("y", d3.mouse(this)[1]-10)
      }
    } else {
      return function(item) {
        svg.text("")
      }
    }
  }

  function showLinks(enter) {
    if (enter) {
      return function(item) {
        var targetParts = item.path.split(PATH_SEPARATOR).length
        var target = graphLinks.filter(l => pathMatch(l.source.path, item.path) == targetParts 
                                             || pathMatch(l.target.path, item.path) == targetParts )
        target.forEach(l => l.selected = true)
        drawLinks()
      }
    } else {
      return function(item) {
        graphLinks.forEach(l => l.selected = false)
        drawLinks()
      }
    }
  }


  var radius = Math.min(width, height) / 2
 
  var partition = d3.layout.partition()
      .sort((a,b) => a.sort-b.sort)
      .size([2 * Math.PI, radius])
      //.value(d => d.links ? d.links : 1)
      .value(d => d._children ? d._children.length : 1)

  var nodes = partition.nodes(graph.tree)
  var colors = domainColors(nodes, svg, 10, 15)
  var colorsFN = colors.fn
  colors.fn = function(d) {
    var c = colorsFN(d.domain)
    if (selection.indexOf(d.path) >= 0) {return d3.rgb(c).darker()}
    return c
  }
  nodes = colors.nodes

  var maxDepth = nodes.reduce((acc, n) => Math.max(n.depth, acc), 0)
 
  svg = svg.append("g").attr("transform", "translate(" + width / 2 + "," + height * .52 + ")")

  var arc = d3.svg.arc()
      .startAngle(d => d.x)
      .endAngle(d => d.x + d.dx)
      .innerRadius(d => radius - (radius/(maxDepth+5))*(d.depth-1))
      .outerRadius(d => radius - (radius/(maxDepth+5))*d.depth)

  var label = svg.append("text")
                 .attr("id", "hover-label")
                 .attr("text-anchor", "middle")
                 .attr("pointer-events", "none")

  svg.insert("g","#hover-label").attr("id", "nodes").selectAll("path")
       .data(nodes)
     .enter().append("path")
       .attr("class", "node")
       .attr("name", d => d.id)
       .attr("display", function(d) { return d.depth ? null : "none"; }) // hide inner ring
       .attr("path" , d=> d.path)
       .attr("d", arc)
       .style("stroke", "#fff")
       .attr("fill", d => colors.fn(d))
       .style("fill-rule", "evenodd")
       .on("click", nodeClick)
       .on("mousemove", showId(label, true))
       .on("mouseenter", showLinks(true))
       .on("mouseleave.tip", showId(label, false))
       .on("mouseleave.link", showLinks(false))
 
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
               .map((l,i) => {return {selected: l.selected,
                                      source: nodes[pathToIndex(l.source, nodes)], 
                                      target: nodes[pathToIndex(l.sink, nodes)]}})

  var linkRoot = svg.append("g").attr("id", "links")
  drawLinks()

  function drawLinks() {
    //A separate function to support the mouse-over-highlights-links behavior
    var bundle = d3.layout.bundle()
    var link = linkRoot.selectAll(".graph-link").data(bundle(graphLinks), (d,i) => i)
    var line = d3.svg.line()
                .interpolate("bundle")
                .tension(.85)
                .x(d => toCartesian(d.center).x)
                .y(d => toCartesian(d.center).y)

    link.enter().append("path")
       .attr("class", "graph-link")
       .attr("d", line)

    link 
       .attr("fill-opacity", "0")
       .attr("stroke-width", (d,i) => graphLinks[i].selected ? 2 : 1)
       .attr("stroke", (d, i) => graphLinks[i].selected ? "black" : "gray")
       .attr("pointer-events", "none")

    link.exit().remove()
  }

  //SELECTION LINKS
  var selectionPoints = selection.map(s => nodes[pathToIndex(s, nodes)])
                                 .filter(n => n)
                                 .map(n => toCartesian(n.centroid))

  var crossed = cross(selectionPoints)
  var selectionRoot = svg.append("g").attr("id", "selection-links")
                         .selectAll(".selection-link").data(crossed)

  selectionRoot.enter().append("line")
    .attr("x1", d => d[0].x)
    .attr("y1", d => d[0].y)
    .attr("x2", d => d[1].x)
    .attr("y2", d => d[1].y)
    .attr("fill-opacity", 0)
    .attr("stroke-width", 2)
    .attr("stroke", "green")
}



// ------------------   Drawing Utilities ------------

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
    var legendRoot = svg.append("g")
                    .attr("class", "legend")
                    .attr("transform", "translate(" + x + "," + y + ")")
    legend = legendRoot.selectAll(".circle").data(domains)
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

  return {fn: fn, nodes: nodes, legend: legendRoot}
}

function toCartesian(radius, angleInRadians) {
  //Convert radius,angle to {x,y}
  //Two arguments: radius, angleInRadians
  //One Argument: [radius, angleInRadians]
  //One Argument: {r: radius, t: angleInRadians}

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
