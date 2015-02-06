angular.module('DepotMapCtrl', []).controller('DepotMapController', function($scope,$routeParams,$rootScope, $http,Socket , Depot) {
  var knownLocations = [{name: 'bloomington', location: {longitude:-86.526386, latitude: 39.165325}}]

  var knownIPs = ["24.1.111.131" , // bloomington
                  "173.194.123.46", // google
                  "128.83.40.146" , // UT austin
                  "128.2.42.52" , // CMU
                  "130.207.244.165" // GA Tech
  ];

  services_url = "http://localhost:42424/api/services"
  d3.json(services_url, function(error, raw) {
    var map = baseMap("#downloadMap", 960, 500)

    allServiceData(services_url, raw, mapPoints(map.projection, map.svg, "depots"))
    
    ipToLocation(knownIPs, mapPoints(map.projection, map.svg, "ips")) 
    mapPoints(map.projection, map.svg, "known-locations")(knownLocations)

    if (typeof $routeParams.depotId != 'undefined') {
      highlightMapLocations(map.svg, ".eodnNode", function(d) {return this.getAttribute("depot_id") == $routeParams.depotId})
      //highlightMapLocation(map.svg, "130.207.244.165")
    }
  });
}); // end controller


