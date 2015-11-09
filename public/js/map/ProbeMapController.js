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
    .then(function() {linkHopLegend(map)})
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
                            if (e.port) {e.port.forEach(p => acc.set(p.href, e))}
                            if (e.ports) {e.ports.forEach(p => acc.set(p.href, e))}
                            return acc
                          }, new Map())

                          var nodeMap = nodes.reduce((acc, e) => {acc.set(e.selfRef, e); return acc}, new Map())

                          showNodes(map, nodes)
                          showLinks(map, links, portMap)
                          showPaths(map, paths, nodeMap)
                        })
                        .catch(e => {throw e})
                      
  return loadNetwork 
}

function showNodes(map, nodes) {
  var locations = nodes.map(e => {return {name: e.id, location: e.location}})
  mapPoints(map.projection, map.svg, "depots")(locations)
}

function showLinks(map, linkData, portMap) {
  var locations = linkData.map(e => e.endpoints)
          .filter(e => portMap.has(e.source.href) && portMap.has(e.sink.href))
          .map(e => {return {source: portMap.get(e.source.href).location, sink: portMap.get(e.sink.href).location}})
          .map(e => {return {source: [e.source.longitude, e.source.latitude], sink: [e.sink.longitude, e.sink.latitude]}})
          .map(e => {return {source: map.projection(e.source), sink: map.projection(e.sink)}})

  var overlay = map.svg.insert("g", "#overlay").attr("name", "links")
  var links = overlay.selectAll(".link").data(locations)
  links.enter().append("line")
       .attr("class", "link")
       .attr("x1", d => d.source[0])
       .attr("y1", d => d.source[1])
       .attr("x2", d => d.sink[0])
       .attr("y2", d => d.sink[1])
       .attr("stroke-width", 2)
       .attr("stroke", hopScale({type: "link"}))
}

var healthScale = d3.scale.ordinal().domain(["GOOD", "UNKNOWN", "BAD"]).range(["#98df8a", "#ffbb78", "#d62728"])
function hopScale (d) {
  if (d.type && d.type.toUpperCase() == "LINK") {return "gray"}
  else if (healthScale.domain().indexOf(d.healthiness.toUpperCase()) < 0) {return healthScale("UNKNOWN")}
  else {return healthScale(d.healthiness.toUpperCase())}
}

function showPaths(map, pathData, nodeMap) {
  var locations = pathData.map(function(e) {
      var places = e.hops.map(e => e.href)
      places.unshift(e.src)
      places.push(e.dst)
      var locs = places.map(e => nodeMap.get(e).location).map(e => map.projection([e.longitude, e.latitude]))
      return {locations: locs, healthiness: e.healthiness, status: e.status}
    }).map(function(e) {
      var pairs = []
      for (var i=0; i< e.locations.length-1; i++) {
        pairs.push({source: e.locations[i], sink: e.locations[i+1]})
      }
      return pairs.map(p => {return {locations: p, healthiness: e.healthiness, status: e.status}})
    }).reduce((acc, e) => acc.concat(e), [])
    .filter(e => e.status.toUpperCase() != "OFF")

  var pathKey = function(loc){return loc.source[0]+"_"+loc.source[1]+"_"+loc.sink[0]+"_"+loc.sink[1]}
  var pairs = new Map() 
  locations = locations.map(function(e) {
    var key = pathKey(e.locations)
    if (pairs.has(key)) {pairs.set(key, pairs.get(key)+1)}
    else {pairs.set(key, 1)}
    e.count = pairs.get(key)
    return e
  })

  var overlay = map.svg.insert("g", "#overlay").attr("name", "hops")
  var hops = overlay.selectAll(".link").data(locations)
  hops.enter().append("path")
      .attr("d", d => link_arc(d.locations.source, d.locations.sink, d.count, d.healthiness))
      .attr("stroke-width", 2)
      .attr("fill", "none")
      .attr("count", d => d.count)
      .attr("stroke", hopScale)

}


function linkHopLegend(map) {
  //Link/Hop legend
  var legend = map.svg.append("g").attr("class", "legend").attr("transform","translate(30, 10)")
  legend.append("text").text("Link/Hop Legend")


  var entries = [{status: "ON", healthiness: "good", label: "Good"},
                 {status: "ON", healthiness: "unknown", label: "Unknown/Other"},
                 {status: "ON", healthiness: "bad", label: "bad"},
                 {type: "link", label: "Link"}]

  entries.forEach((e,i) => legendEntry(legend, e, e.label, 0, 10+10*i))

  function legendEntry(svg, value, label, x, y) {
    svg = svg.append("g").attr("transform", "translate(" + x + "," + y + ")")

    svg.append("line")
       .attr("x1", 0)
       .attr("y1", 0)
       .attr("x2", 15)
       .attr("y2", 0)
       .attr("stroke", hopScale(value))
       .attr("stroke-width", 3)

    svg.append("text")
       .attr("x", 20)
       .attr("y", 4)
       .attr("text-anchor", "left")
       .text(label)

  }
}
function link_arc(source, target, i, health) {
  health = health.toUpperCase()
  var rotation = (health == "GOOD" ? 0 : (health == "BAD" ? -45 : 45))
  var dx = (target[0] - source[0])+(15*i),
      dy = (target[1] - source[1])+(15*i),
      dr = Math.sqrt(dx * dx + dy * dy);
  return "M" + source[0] + "," + source[1] + "A" + dr + "," + 1.5*dr + " " + rotation + " 0 1 " + target[0] + "," + target[1];
}

function geoMap(selector, width, height, svg) {
  var map = baseMap(selector, width, height, svg)
  return map
}
