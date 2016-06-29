function mapController($scope, $routeParams, $http, UnisService) {
  var map = baseMap("#downloadMap", 960, 500);

  $scope.services = UnisService.services;
  $http.get('/api/natmap')
    .then(function(res) {
      var natmap = res.data;

      allServiceData($scope.services, "ibp_server", natmap,
        mapPoints(map.projection, map.svg, "depots"));

      if (typeof $routeParams.id != 'undefined') {
        console.log($routeParams.id);
        highlightMapLocations(map.svg, ".depotLocation", function(d) {
          return this.getAttribute("depot_id") == $routeParams.id
        });
      }

      return natmap
    })
  .then(function(natmap) {backplaneLinks(map, natmap)})
  .then(function() {
    //Cleanup the tooltip object when you navigate away
    $scope.$on("$destroy", function() {
      d3.selectAll("#map-tool-tip").each(function() {this.remove()})
    })
  })
} // end controller
