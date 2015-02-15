function mapController($scope, $routeParams, $http, UnisService) {
  var map = baseMap("#downloadMap", 960, 500);
  
  $scope.services = UnisService.services;
  
  allServiceData($scope.services, mapPoints(map.projection, map.svg, "depots"));
  
  if (typeof $routeParams.depotId != 'undefined') {
    console.log($routeParams.depotId);
    highlightMapLocations(map.svg, ".eodnNode", function(d) {return this.getAttribute("depot_id") == $routeParams.depotId})
  }
} // end controller


