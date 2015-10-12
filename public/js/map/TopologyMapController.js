function topologyMapController($scope, $routeParams, $http, UnisService) {
  var map = forceMap("#topologyMap", 960, 500); //TODO: Add layout options here: circular, force, geo.  Select based on actual URL (like filter on downloads)
  
  
  //TODO: Hard-coded address is bad...should get through a URL parameter or something... 
  //var topoUrl = "http://dev.incntre.iu.edu:8889/domains/domain_al2s.net.internet2.edu"
  var topoUrl = "http://dev.incntre.iu.edu:8889/domains/domain_es.net"

  $http.get(topoUrl)
    .then(function(domain) {toGraph($http, map, domain)})
    .then(function() {draw(map)})
    .then(function() {
      //Cleanup the tooltip object when you navigate away
      $scope.$on("$destroy", function() {
       d3.selectAll("#map-tool-tip").each(function() {this.remove()})
      })
    })
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
               .attr("id", "network")
               .attr("width", width)
               .attr("height", height)

  var layout = d3.layout.force()
      .size([width, height])
      .linkStrength(function(l) {return l.source.internal && l.target.internal ? 1 : .5})
      .charge(function(n) {return -30*n.weight})

  return {svg:svg, layout: layout}
}

function toGraph($http, map, domain) {
  domain.data.nodes.forEach(function(node) {addNode(map, node)})
  domain.data.links.forEach(function(link) {addLink($http, map, link)})
}

//NOTE: Must be run BEFORE add link, since addLink may add more nodes and this does not check for existing names 
function addNode(map, nodeRef) {
  console.log(nodeRef)
  d3.json(nodeRef.href, function(err, node) {
    var parts = node.urn.match("node=(.*?)(:|$)")
    node['id'] = parts[1]
    node['internal'] = true
    map.layout.nodes().push(node)
  })
}


//Given a link endpoint entry, tries to get the details
function endpointDetails($http, endpoint) {
  if (endpoint.startsWith("http")) {
    return $http.get(endpoint)
             .then(function(rsp) {
                 var parts = rsp.data.urn.match("node=(.*?)(:|$)") 
                 return parts[1];
             })
     }
  else if (endpoint.startsWith("urn")) {
    return new Promise(function(resolve, reject) {
      var parts = endpoint.split(":")
      resolve(parts[4])
    })
  } else {
    throw "Unknown endpoint format: " + endpoint
  }
}

function indexOf(nodes, id) {
   for (var i =0 ; i< nodes.length; i++) {
     if (nodes[i].id == id) {return i;}
   }
   nodes.push({id: id, internal: false})
   return nodes.length -1;
}

function addLink($http, map, link) {
  //follow link URL
  //parse out source/target
  layout = map.layout 
  $http.get(link.href)
    .then(function(rsp) {
        var source = endpointDetails($http, rsp.data.endpoints.source.href)
        var target = endpointDetails($http, rsp.data.endpoints.sink.href)

        Promise.all([source, target])
           .then(function(rslt) {
                 var nodes = layout.nodes()

                 var source_idx = indexOf(nodes, rslt[0])
                 var target_idx = indexOf(nodes, rslt[1])

                 if (source_idx != target_idx) {
                   layout.links().push({
                      source: source_idx, 
                      target: target_idx,
                      source_detail: rslt[0], 
                      target_detail: rslt[1]})
                   return true
                 } 
                 return false
          })
          .then(function(doDraw) {if (doDraw) {draw(map)}})
    })
}

function draw(map) {
  var svg = map.svg
  var layout = map.layout
  layout.start()

  var node = svg.selectAll(".node").data(layout.nodes())
  var link = svg.selectAll(".link").data(layout.links())

  link.enter().append("line").attr("class", "link")
  node.enter().append("circle").attr("class", "node")

  layout.on("tick", function(e) {
    link.attr("x1", function(d) {return d.source.x})
        .attr("y1", function(d) {return d.source.y})
        .attr("x2", function(d) {return d.target.x})
        .attr("y2", function(d) {return d.target.y})
        .style("stroke", function(d) {return d.source.internal && d.target.internal ? "red" : "gray"})
    
    node.attr("name", function(d) {return d.id})
        .attr("cx", function(d) {return d.x})
        .attr("cy", function(d) {return d.y})
        .attr("r", function(d) {console.log(d.deviceType); return d.deviceType ? 10 : 5})
        .attr("fill", function(d) {return d.internal ? "red" : "gray"})
  })
  tooltip(svg, "circle.node")
  return map
}
