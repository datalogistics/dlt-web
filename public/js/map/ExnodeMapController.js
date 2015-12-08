function exnodeMapController($scope, $location, $http, UnisService, SocketService) {
  var svg = d3.select("#exnodeMap").append("svg")
               .attr("width", 1200)
               .attr("height", 900)

  var map = baseMap("#exnodeMap", 960, 500, svg);
  var nodeId = $location.path().split("/")[2]

  $scope.services = UnisService.services
  $http.get('/api/natmap')
    .then(function(res) {
      var natmap = res.data;
      allServiceData($scope.services, "ibp_server", natmap,
        mapPoints(map.projection, map.svg, "depots"));
      return natmap
    })
    .then(function(natmap) {backplaneLinks(map, natmap)})
    .then(() => $http.get('/api/exnodes/')) //TODO: Extend the api to accept a node ID, remove next line
    .then((res) => res.data.filter(n=>n.id==nodeId)[0])
    .then(exnode => displayExnode(map, nodeId, exnode)) 
  
  $scope.$on("$destroy", function() {
    d3.selectAll("#map-tool-tip").each(function() {this.remove()})  //Cleans up the tooltip object when you navigate away
  })


  function displayExnode(map, nodeId, exnode) {
    var extents = exnode.extents
    
    spokeExtents(map, exnode.size, extents)
    gridmap(map, exnode.size, extents)
  }

  function spokeExtents(svg, rootSize, extents) {
    var located = extents.map(function(e) {return {id: e.id, offset: e.offset, size: e.size, depot: parseLocation(e.mapping.read)}})
                         .map(function(e) {e["xy"] = mapLocation(map, e.depot); return e})

    var arc = d3.svg.arc()
         .innerRadius("1")
         .outerRadius("15")
         .startAngle(d => ((d.offset/rootSize)*2*Math.PI))
         .endAngle(d => ((d.offset+d.size)/rootSize)*2*Math.PI)

    var root = map.svg.insert("g", "#overlay").attr("id", "spokes")
    var fill = d3.scale.category20b()
    root.selectAll("extent").data(located)
      .enter()
        .append("path")
        .attr("id", d => d.id)
        .attr("d", arc)
        .attr("fill", (d,i) => fill(i))
        .attr("transform", d => "translate(" + d.xy[0] + "," + d.xy[1] + ")")
  }

  function gridmap(map, rootSize, extents) {
    //TODO: Convert to a 2D space, not the 1D strip here...
    
    var width = 900
    var height = 100
   
    var root = map.svg.append("g").attr("id", "#gridmap").attr("transform","translate(100,500)")

    root.append("rect")
        .attr("id", "grid-background")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "#DDD")

    var fill = d3.scale.category20b()
    root.selectAll("extent").data(extents)
      .enter().append("rect")
        .attr("id", d => d.id)
        .attr("height", height)
        .attr("width", d => (d.size/rootSize)*width)
        .attr("x", d => (d.offset/rootSize)*width)
        .attr("y", 0)
        .attr("fill", (d,i) => fill(i))
  }

  function parseLocation(mapping) {return mapping.split("/")[2]}
} 


