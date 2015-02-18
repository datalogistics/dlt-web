function mapController($scope, $routeParams, $http, UnisService) {
  var map = baseMap("#downloadMap", 960, 500);
  
  $scope.services = UnisService.services;
  
  allServiceData($scope.services, mapPoints(map.projection, map.svg, "depots"));
  
  if (typeof $routeParams.id != 'undefined') {
    console.log($routeParams.id);
    highlightMapLocations(map.svg, ".eodnNode", function(d) {return this.getAttribute("depot_id") == $routeParams.id})
  }
} // end controller


