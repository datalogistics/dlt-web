function topologyMapController($scope, $routeParams, $http, UnisService) {
  var map = forceMap("#topologyMap", 960, 500); //TODO: Add layout options here: circular, force, geo.  Select based on actual URL (like filter on downloads)
  
  
  //TODO: Hard-coded address is bad...should get through a URL parameter or something... 
  var topoUrl = "http://dev.incntre.iu.edu:8889/domains"
  var topoUrl = "http://dev.incntre.iu.edu:8889/domains/domain_al2s.net.internet2.edu"
  //var topoUrl = "http://dev.incntre.iu.edu:8889/domains/domain_es.net"

  $http.get(topoUrl)
    .then(mergeDomains)
    .then(function(domain) {toGraph($http, map, domain)})
    .then(function() {draw(map)})
    .then(function() {
      //Cleanup functions here!
      $scope.$on("$destroy", function() {d3.selectAll("#map-tool-tip").each(function() {this.remove()})})  //Cleanup the tooltip object when you navigate away
    })
}

//Takes a list of domains and makes it look like a single domain
//
//Resulting domain always has nodes, links, ports and id entries (may have others)
//Nodes will have been converted to JUST the href field (to ensure single representation)
function mergeDomains(rsp) {
  if (!Array.isArray(rsp.data)) {
    var full = rsp.data
    full.nodes = full.nodes.map(function(n) {return n.href})
  } else {
    var full = rsp.data.reduce(function(acc, v, i, a) {
      v.nodes.forEach(function (n) {acc.nodes.add(n.href)})
      //acc.nodes = acc.nodes.concat(v.nodes)
      acc.links = acc.links.concat(v.links)
      acc.ports = acc.ports.concat(v.ports)
      acc.id = acc.id + " " + v.id + ","
      return acc
    },
    {id:"All:", nodes:new Set(), links:[], ports:[]})
    full.id = full.id.slice(0, full.id.length-2)
  }
  return full
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
  
  var layout = d3.layout.force()
      .size([width, height])
      .linkDistance(function(l) {return l.source.internal && l.target.internal ? 40 : 20})
      .linkStrength(function(l) {return l.source.internal && l.target.internal ? 1 : .5})
      .charge(function(n) {return -100*n.weight})

  return {svg:svg, layout: layout}
}

function toGraph($http, map, domain) {
  domain.nodes.forEach(function(node) {addNode(map, node)})
  domain.links.forEach(function(link) {addLink($http, map, link)})
}

//NOTE: Must be run BEFORE add link, since addLink may add more nodes and this does not check for existing names 
function addNode(map, nodeRef) {
  d3.json(nodeRef, function(err, node) {
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
      var item = parts.filter(function(v) {return v.startsWith("node=")})
      if (item.length > 0) {item = item[0].slice(5)}
      else {item = parts[4]} //HACK: Just happens to be where it lands when the urn is one format...probably not robus
      resolve(item)
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

  node.enter().append("circle").attr("class", "node")
  link.enter().append("line").attr("class", "link")

  layout.on("tick", function(e) {
    link.attr("x1", function(d) {return d.source.x})
        .attr("y1", function(d) {return d.source.y})
        .attr("x2", function(d) {return d.target.x})
        .attr("y2", function(d) {return d.target.y})
        .style("stroke", function(d) {return d.source.internal && d.target.internal ? "red" : "gray"})
    
    node.attr("name", function(d) {return d.id})
        .attr("cx", function(d) {return d.x})
        .attr("cy", function(d) {return d.y})
        .attr("r", function(d) {return d.deviceType ? 10 : 5})
        .attr("fill", function(d) {return d.internal ? "red" : "gray"})
  })
  tooltip(svg, "circle.node")
  return map
}
