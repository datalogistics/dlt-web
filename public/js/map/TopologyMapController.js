function topologyMapController($scope, $routeParams, $http, UnisService) {
  var topoUrl = "http://dev.incntre.iu.edu:8889/domains" //TODO: generalize...maybe move graph-loading stuff to the server (like 'natmap' or the download tracking data)
  var topoUrl = "http://dev.incntre.iu.edu:8889/domains/domain_al2s.net.internet2.edu"
  var topoUrl = "http://dev.incntre.iu.edu:8889/domains/domain_es.net"

  var svg = d3.select("#topologyMap").append("svg")
               .attr("width", 1200)
               .attr("height", 500)

  var map = forceMap("#topologyMap", 960, 500, svg); //TODO: Add layout options here: circular, force, geo.  Select based on actual URL (like filter on downloads)
  
  $http.get(topoUrl)
    .then(rsp => toGraph($http, rsp))
    .then(graph => buildLayout(map, graph))
    .then(function() {draw(map)})
    .then(function() {
      //Cleanup functions here!
      $scope.$on("$destroy", function() {d3.selectAll("#map-tool-tip").each(function() {this.remove()})})  //Cleanup the tooltip object when you navigate away
    })
    .catch(e => {throw e})

}

//Graph is {root: id, nodes: {}, links: ...} 
//
//Nodes is a heirarchy made from dictionaries {id: x, parent: y, children: []}.  Each node is stored under its id
//Links is a list of dictionaries {source: x, target: y}
//root, parent, source, target and the contents of the children list are all id's in the node hierarchy
function toGraph($http, rsp) {
  rsp = rsp.data
  if (!Array.isArray(rsp)) {
    var full = {nodes: {}, edges: []}
    var root = rsp.id

    var allNodes = Promise.all(rsp.nodes.map(n => $http.get(n.href)))
    var allLinks = Promise.all(rsp.links.map(e => $http.get(e.href)))

    var details = allNodes.then(nodes => nodes.map(n => {return {id: parseNodeURN(n.data.urn), internal: true, parent: root, children: []}}))
                           .then(function(nodes) {
                                  var dict = {}
                                  nodes.forEach(n => {dict[n.id] = n})
                                  dict[root] = {id: root, parent: null, children: Array.from(Object.keys(dict))}
                                  return dict})
                           .then(nodes => {return allLinks.then(function(links) {
                                                     var linkDetails = links.map(l => getLinkDetails($http, l.data))
                                                     return Promise.all(linkDetails)
                                                                   .then(links => {return links.map(l=>{return {id: l.id, source: l.source, sink: l.sink}})})
                                                                   .then(links => {
                                                                            links.forEach(link => ensureNodes(nodes, link, root))
                                                                            return {nodes: nodes, links: links, root: root}})})})
   return details
  } else {
    var full = rsp.reduce(function(acc, v, i, a) {
      v.nodes.forEach(function (n) {addDomain(acc.nodes, n.href, 'href', v.id)})
      acc.links = acc.links.concat(v.links)
      acc.ports = acc.ports.concat(v.ports)
      acc.ids.push(v.id)
      return acc
    },
    {id:"All", nodes:[], links:[], ports:[], ids: []})
    full.nodes = Array.from(full.nodes)
  }
  return full
}

function addDomain(list, target, key, domain) {
  for(var i=0; i<list.length; i++) {
    if (list[i][key]==target) {
      list[i].domains.add(domain); return;
    }
  }
  var entry = {}
  entry[key] = target
  entry['domains'] = new Set([domain])
  list.push(entry)
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

function getLinkDetails($http, link) {
    var source = getEndpointDetails($http, link.endpoints.source.href)
    var target = getEndpointDetails($http, link.endpoints.sink.href)
    return Promise.all([source, target]).then(function(rslt) {return {id: link.id, source: rslt[0], sink: rslt[1]}})
}

//Ensure that a node is in the nodes list.  Add it with the given parent if it is not.
function ensureNodes(nodes, link, parent) {
   if (!nodes[link.source]) {nodes[link.source] = {id: link.source, internal: false, parent: parent, children:[]}}
   if (!nodes[link.sink]) {nodes[link.sink] = {id: link.sink, internal: false, parent: parent, children:[]}}
}


function buildLayout(map, graph) {
  var nodes = Array.from(Object.keys(graph.nodes))
  var links = graph.links.map(l => {return {source: nodes.indexOf(l.source), target: nodes.indexOf(l.sink)}})
                         .filter(l => l.source != l.target)
  
  //TODO: map.layout = map.makeLayout(nodes, links) to handle geo and force  
  map.layout.nodes(nodes.map(e => {return {id: e, internal: graph.nodes[e].internal}}))
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
    link.attr("x1", function(d) {return d.source.x})
        .attr("y1", function(d) {return d.source.y})
        .attr("x2", function(d) {return d.target.x})
        .attr("y2", function(d) {return d.target.y})
        .style("stroke", function(d) {
          return d.source.internal && d.target.internal ? "red" : "gray"}
        )
    
    node.attr("name", function(d) {return d.id})
        .attr("cx", function(d) {return d.x})
        .attr("cy", function(d) {return d.y})
        .attr("r", function(d) {return d.deviceType ? 10 : 5})
        .attr("fill", function(d) {return d.internal ? "red" : "gray"})
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

