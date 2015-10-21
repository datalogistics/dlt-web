function probeMapController($scope, $routeParams, $http, UnisService) {
  //TODO: Maybe move graph-loading stuff to the server (like download tracking data) so the UNIS instance isn't hard-coded
  var topoUrl = "http://dev.incntre.iu.edu:8889/domains/" 
  if ($routeParams.domain) {topoUrl = topoUrl + $routeParams.domain}
    
    
  //var topoUrl = "http://dev.incntre.iu.edu:8889/domains/domain_al2s.net.internet2.edu"
  //var topoUrl = "http://dev.incntre.iu.edu:8889/domains/domain_es.net"
  var svg = d3.select("#probeMap").append("svg")
               .attr("width", 1200)
               .attr("height", 500)

  var map = geoMap("#probeMap", 960, 500, svg)
  loadNetwork($http, map)
    .then(function() {
      //Cleanup functions here!
      $scope.$on("$destroy", function() {d3.selectAll("#map-tool-tip").each(function() {this.remove()})})  //Cleanup the tooltip object when you navigate away
    })
    .catch(e => {throw e})

}

function loadNetwork($http, map) {
  var nodesURL = "http://dev.incntre.iu.edu:8889/nodes"
  var linksURL = "http://dev.incntre.iu.edu:8889/links"
  var pathsURL = "http://dev.incntre.iu.edu:8889/paths"

  var allNodes = $http.get(nodesURL).then(rslt => rslt.data)
  var allLinks = $http.get(linksURL).then(rslt => rslt.data)
  var allPaths = $http.get(pathsURL).then(rslt => rslt.data)

  var loadNetwork = Promise.all([allNodes, allLinks, allPaths])
                        .then(function(rslt) {
                          var nodes = rslt[0]
                          var links = rslt[1]
                          var paths = rslt[2]

                          var portMap = nodes.reduce((acc, e) => {
                            if (e.port) {e.port.forEach(p => acc.set(p, e))}
                            if (e.ports) {e.ports.forEach(p => acc.set(p, e))}
                            return acc
                          }, new Map())

                          showNodes(map, nodes)
                          showLinks(map, links, portMap)
                          showPaths(map, paths)
                        })
                        .catch(e => {throw e})
                      
  return loadNetwork 
}

function showNodes(map, nodes) {
  var locations = nodes.map(e => {return {name: e.id, location: e.location}})
  mapPoints(map.projection, map.svg, "depots")(locations)
}

function showLinks(map, links, portMap) {
  //var locations = links.map(e => {return {source: portMap[e.endpoints.source.href].id, sink: portMap[e.endpoints.sink.href].id}})
  //                     .map(e => {return {source: map.select("#" + e.source).node().parentNode, 
  //                                          sink: map.select("#" + e.sink).node().parentNode}})
  //                     .map(e => {return {source: d3.transform(e.source.attr("transform")).translate,
  //                                          sink: d3.transform(e.sink.attr("transform")).translate}})
  //locations.forEach(e => {
  // overlay.append("path")
  //      .attr("d", link_arc(a, z))
  //      .attr("stroke-width", (link.capacity/100000)+.5)
  //      .attr("fill", "none")
  //      .attr("stroke", link_color(link.type))
  //      .attr("class", "geni_link")
  //})

  console.log(links)
}

function showPaths(map, paths) {
  console.log(paths)
}

function geoMap(selector, width, height, svg) {
  var map = baseMap(selector, width, height, svg)
  //map.doLayout = function(map, graph) {
  //  var nodes = Array.from(Object.keys(graph.nodes))
  //  nodes = nodes.map(e => graph.nodes[e])
  //  nodes.forEach(e => e['location'] = e.location ? e.location : [])
  //  nodes.forEach(e => e['name'] = e.id)
  //  nodes.forEach(e => e['port'] = "")
  //  mapPoints(map.projection, map.svg, "nodes")(nodes)
  //}
  return map
}
