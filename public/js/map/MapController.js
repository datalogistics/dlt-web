function mapController($scope, $routeParams, $http, UnisService) {
  var map = baseMap("#downloadMap", 960, 500);
  
  $scope.services = UnisService.services;
  
  allServiceData($scope.services, "ibp_server", mapPoints(map.projection, map.svg, "depots"));
  
  if (typeof $routeParams.id != 'undefined') {
    console.log($routeParams.id);
    highlightMapLocations(map.svg, ".eodnLocation", function(d) {return this.getAttribute("depot_id") == $routeParams.id})
  }


  //Cleanup the tooltip object when you navigate away
  $scope.$on("$destroy", function() {
    d3.selectAll("#map-tool-tip").each(function() {this.remove()})
  })
} // end controller


