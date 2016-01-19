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

  $http.get(topoUrl)
    .then(rsp => toGraph($http, rsp.data))
    .then(function(graph) {map.doDraw(map, graph)})
    .then(function() {
      //Cleanup functions here!
      $scope.$on("$destroy", function() {d3.selectAll("#map-tool-tip").each(function() {this.remove()})})  //Cleanup the tooltip object when you navigate away
    })
    .catch(e => {throw e})

}

function loadDomain($http, rsp) {
    var root = rsp.id
    var allNodes = rsp.nodes === undefined
                    ? Promise.resolve([])
                    : Promise.all(rsp.nodes.map(n => $http.get(n.href)))
                          .then(nodes => nodes.map(n => n.data[0])) 
                          .then(nodes => nodes.map(n => ensureNode({}, parseNodeURN(n.urn), {location: n.location, internal: true, parent: root, domains: new Set([root])})))
                          .then(nodes => nodes.reduce((dict, n) => {dict[n.id] = n; return dict;}, {}))
                          .then(nodes => {ensureNode(nodes, root, {internal: false, level: "domain", domains: new Set([root]), children: Array.from(Object.keys(nodes))}); return nodes;})
                          .catch(e => {throw e})

    var allLinks = rsp.links == undefined 
                   ? Promise.resolve([])
                   : Promise.all(rsp.links.map(e => $http.get(e.href)))
                          .then(links => Promise.all(links.map(l=> loadEndpoints($http, l.data[0]))))
                          .then(links => links.map(l=>{return {id: l.id, source: l.source, sink: l.sink}}))
                          .catch(e => {throw e})
                                               
   return Promise.all([allNodes, allLinks])
                 .then(items => {
                   //Merge!
                   var nodes = items[0]
                   var links = items[1]
                   links.forEach(link => ensureNodes(nodes, link, {parent: root, internal: false, level: "domain_entry", domains: new Set([root])}))
                   return {nodes: nodes, links: links, root: root}})
                 .catch(e => {throw e})
}


//Graph is {root: id, nodes: {}, links: ...} 
//
//Nodes is a heirarchy made from dictionaries {id: x, parent: y, children: []}.  Each node is stored under its id
//Links is a list of dictionaries {source: x, target: y}
//root, parent, source, target and the contents of the children list are all id's in the node hierarchy
function toGraph($http, rsp) {
  if (!Array.isArray(rsp)) {return loadDomain($http, rsp)}
  else {
    var domains = rsp.map(d => loadDomain($http, d))
    return Promise.all(domains).then(mergeDomains)
  }
}

function mergeDomains(domains) {
  return domains.reduce((full, domain) => {
                           Object.keys(domain.nodes).forEach(
                                function(key) {
                                  var item = domain.nodes[key]
                                  if (!full.nodes[key]) {full.nodes[key] = item}
                                  else {
                                    item.domains.forEach(d => full.nodes[key].domains.add(d))
                                  }
                                })
                           full.links = full.links.concat(domain.links)
                           full.root.push(domain.root)
                           return full;}, 
                           {nodes: {}, links: [], root: []})
}

function parseNodeURN(urn) {
    var parts = urn.split(":")
    var item = parts.filter(function(v) {return v.startsWith("node=")})
    if (item.length > 0) {item = item[0].slice(5)}
    else {item = parts[4]} //HACK: Just happens to be where it lands when the urn is one format...probably not robus
    return item
}


//Given a link endpoint entry, tries to get the details
function getEndpointDetails($http, endpoint) {
  if (endpoint.startsWith("http")) {
    return $http.get(endpoint)
             .then(function(rsp) {
                 var parts = rsp.data[0].urn.match("node=(.*?)(:|$)") 
                 return parts[1];
             })
     }
  else if (endpoint.startsWith("urn")) {
    return new Promise(function(resolve, reject) {resolve(parseNodeURN(endpoint))})
  } else {
    throw "Unknown endpoint format: " + endpoint
  }
}

function loadEndpoints($http, link) {
    var source = getEndpointDetails($http, link.endpoints.source.href)
    var target = getEndpointDetails($http, link.endpoints.sink.href)
    return Promise.all([source, target]).then(function(rslt) {return {id: link.id, source: rslt[0], sink: rslt[1]}})
}

//Ensures a node with the given id exists in the node list.  
//Uses the 3rd "defaults" paramter to build a new one if it does not
function ensureNode(nodes, node, defaults) {
   defaults.parent   = (defaults.parent   === undefined) ? null           : defaults.parent
   defaults.level    = (defaults.level    === undefined) ? "domain_entry" : defaults.level
   defaults.children = (defaults.children === undefined) ? []             : defaults.children
   defaults.internal = (defaults.internal === undefined) ? false          : defaults.internal
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
      .linkDistance(function(l) {return l.source.internal && l.target.internal ? 40 : 20})
      .linkStrength(function(l) {return l.source.internal && l.target.internal ? 1 : .5})
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
        .attr("r", function(d) {return d.details.internal ? 10 : 5})
        .attr("level", function(d) {return d.details.level})
        .attr("visibility", "hidden")
        .call(layout.drag)
        .attr("fill", function(d) {
            if(d.details.domains.size > 1) {return "gray"}
            if(d.details.domains.size == 0) {return "red"}
            var domain =d.details.domains.values().next().value //Just one entry, gets it out
            var base = colors(domain)
            if (d.details.internal) {base = d3.rgb(base).brighter();}
            return base
        })
          //function(d) {return d.details.internal ? "red" : "gray"})

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

// ---- Circular embedding ----
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

    console.log(graph.links)
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


function geoMap(selector, width, height, svg) {
  var map = baseMap(selector, width, height, svg)
  map.doDraw = function() {}
  map.doLayout = function(map, graph) {
    var nodes = Array.from(Object.keys(graph.nodes))
    nodes = nodes.map(e => graph.nodes[e])
    nodes.forEach(e => e['location'] = e.location ? e.location : [])
    nodes.forEach(e => e['name'] = e.id)
    nodes.forEach(e => e['port'] = "")
    mapPoints(map.projection, map.svg, "nodes")(nodes)
  }
  return map
}
