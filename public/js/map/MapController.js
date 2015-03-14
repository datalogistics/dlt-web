var link_map = {
  "ucd-ucla"  : {
    "type": "al2s",
    "capacity": 300000,
    "endpoint_a": "128.120.83.7",
    "endpoint_z": "164.67.126.3"
  },
  "ucla-mizz" : {
    "type": "al2s",
    "capacity": 300000,
    "endpoint_a": "164.67.126.3",
    "endpoint_z": "128.206.119.41"
  },
  "ucla-utah" : {
    "type": "ion",
    "capacity": 300000,
    "endpoint_a": "164.67.126.3",
    "endpoint_z": "155.99.144.102"
  },
  "tamu-mizz" : {
    "type": "al2s",
    "capacity": 200000,
    "endpoint_a": "128.194.6.134",
    "endpoint_z": "128.206.119.41"
  },
  "mizz-nyser" : {
    "type": "al2s",
    "capacity": 300000,
    "endpoint_a": "128.206.119.41",
    "endpoint_z": "199.109.64.53"
  },
  "nyser-max" : {
    "type": "al2s",
    "capacity": 100000,
    "endpoint_a": "128.206.119.41",
    "endpoint_z": "206.196.180.223"
  },
  "nyser-bbn" : {
    "type": "ion",
    "capacity": 100000,
    "endpoint_a": "128.206.119.41",
    "endpoint_z": "192.1.242.158"
  },
  "renci-bbn" : {
    "type": "ion",
    "capacity": 100000,
    "endpoint_a": "152.54.14.26",
    "endpoint_z": "192.1.242.158"
  }
};    

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
      
      //Cleanup the tooltip object when you navigate away
      $scope.$on("$destroy", function() {
	d3.selectAll("#map-tool-tip").each(function() {this.remove()})
	  });
    });
} // end controller


