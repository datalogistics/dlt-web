function exnodeMapController($scope, $location, $http, UnisService, SocketService) {
  var svg = d3.select("#exnodeMap").append("svg")
               .attr("width", 1200)
               .attr("height", 500)

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
    
    spokeExtents(map, extents)
  }

  function spokeExtents(svg, extents) {
    var located = extents.map(function(e) {return {id: e.id, offset: e.offset, size: e.size, depot: parseLocation(e.mapping.read)}})
                         .map(function(e) {e["xy"] = mapLocation(map, e.depot); return e})
    console.log(located)

    var root = map.svg.insert("g", "#overlay").attr("id", "spokes")
    root.selectAll("extent").data(located)
      .enter()
        .append("circle")
        .attr("r", 10)
        .attr("fill", "blue")
        .attr("cx", d => d.xy[0])
        .attr("cy", d => d.xy[1])


  }

  function parseLocation(mapping) {return mapping.split("/")[2]}
} 


