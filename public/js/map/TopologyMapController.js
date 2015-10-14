function topologyMapController($scope, $routeParams, $http, UnisService) {
  var topoUrl = "http://dev.incntre.iu.edu:8889/domains" //TODO: generalize...maybe move graph-loading stuff to the server (like 'natmap' or the download tracking data)
  //var topoUrl = "http://dev.incntre.iu.edu:8889/domains/domain_al2s.net.internet2.edu"
  //var topoUrl = "http://dev.incntre.iu.edu:8889/domains/domain_es.net"

  var svg = d3.select("#topologyMap").append("svg")
               .attr("width", 1200)
               .attr("height", 500)

  var map = forceMap("#topologyMap", 960, 500, svg); //TODO: Add layout options here: circular (pack layout), force, geo.  Select based on actual URL (like filter on downloads)

  $http.get(topoUrl)
    .then(rsp => toGraph($http, rsp.data))
    .then(graph => buildLayout(map, graph))
    .then(function() {draw(map)})
    .then(function() {
      //Cleanup functions here!
      $scope.$on("$destroy", function() {d3.selectAll("#map-tool-tip").each(function() {this.remove()})})  //Cleanup the tooltip object when you navigate away
    })
    .catch(e => {throw e})

}

function loadDomain($http, rsp) {
    var root = rsp.id
    var allNodes = Promise.all(rsp.nodes.map(n => $http.get(n.href)))
                          .then(nodes => nodes.map(n => ensureNode({}, parseNodeURN(n.data.urn), {internal: true, parent: root})))
                          .then(nodes => nodes.reduce((dict, n) => {dict[n.id] = n; return dict;}, {}))
                          .then(nodes => {ensureNode(nodes, root, {internal: false, level: "domain", children: Array.from(Object.keys(nodes))}); return nodes;})
                          .catch(e => {throw e})

    var allLinks = Promise.all(rsp.links.map(e => $http.get(e.href)))
                          .then(links => Promise.all(links.map(l=> loadEndpoints($http, l.data))))
                          .then(links => links.map(l=>{return {id: l.id, source: l.source, sink: l.sink}}))
                          .then(links => {return {links: links, nodes: links.reduce((nodes, link) => {ensureNodes(nodes, link, root, "domain_entry"); return nodes}, {})}})
                          .catch(e => {throw e})
                                               
   return Promise.all([allNodes, allLinks])
                 .then(items => {
                   //Merge!
                   var nodes = items[0]
                   var links = items[1].links
                   var linkNodes = items[1].nodes
                   Object.keys(linkNodes).forEach(key => {if (!nodes[key]) {nodes[key] = linkNodes[key]}})
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
                                Object.keys(domain.nodes).forEach(key => {if (!full.nodes[key]) {full.nodes[key] = domain.nodes[key]}})
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
                 var parts = rsp.data.urn.match("node=(.*?)(:|$)") 
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

function ensureNode(nodes, node, options) {
   var defaults = {} 
   defaults.parent   = (options.parent   === undefined) ? null           : options.parent
   defaults.level    = (options.level    === undefined) ? "domain_entry" : options.level
   defaults.children = (options.children === undefined) ? []             : options.children
   defaults.internal = (options.internal === undefined) ? false          : options.internal
   defaults.id = node
   
   if (!nodes[node]) {nodes[node] = defaults}
   return nodes[node]
}

//Ensure that a node is in the nodes list.  Add it with the given parent if it is not.
function ensureNodes(nodes, link, parent, level) {
  ensureNode(nodes, link.source, {parent: parent, level: level, internal: false})
  ensureNode(nodes, link.sink,   {parent: parent, level: level, internal: false})
}


function buildLayout(map, graph) {
  var nodes = Array.from(Object.keys(graph.nodes))
  var links = graph.links.map(l => {return {source: nodes.indexOf(l.source), target: nodes.indexOf(l.sink)}})
                         .filter(l => l.source != l.target)
  
  //TODO: map.layout = map.makeLayout(nodes, links) to handle geo and force  
  map.layout.nodes(nodes.map(e => {return {id: e, details: graph.nodes[e]}}))
  map.layout.links(links)
  return map
}

function draw(map) {
  var svg = map.svg
  var layout = map.layout
  layout.start()

  var node = svg.selectAll(".node").data(layout.nodes())
  var link = svg.selectAll(".link").data(layout.links())

  node.enter().append("circle").attr("class", "node")
  link.enter().append("line").attr("class", "link")

  layout.on("tick", function(e) {
    node.attr("name", function(d) {return d.id})
        .attr("cx", function(d) {return d.x})
        .attr("cy", function(d) {return d.y})
        .attr("r", function(d) {return d.deviceType ? 10 : 5})
        .attr("fill", function(d) {return d.details.internal ? "red" : "gray"})
        .attr("level", function(d) {return d.details.level})
        .attr("visibility", "hidden")

    link.attr("x1", function(d) {return d.source.x})
        .attr("y1", function(d) {return d.source.y})
        .attr("x2", function(d) {return d.target.x})
        .attr("y2", function(d) {return d.target.y})
        .style("stroke", function(d) {
          return d.source.details.internal && d.target.details.internal ? "red" : "gray"}
        )

     svg.selectAll('[level="domain_entry"]').attr("visibility", "visible")
     svg.selectAll('[level~="domain_entry"]').attr("visibility", "visible")
  })
  tooltip(svg, "circle.node")
  return map
}

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

  return {svg:map, layout: layout}
}

