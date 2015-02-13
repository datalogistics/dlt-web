/*
 * Setup Our Angular App
 * public/js/
 * app.js
 */

angular.module('measurementApp', ['ngRoute', 'angular-loading-bar', 'ngAnimate','schemaForm',
				  'ui.utils' ,'ui.bootstrap', 'nvd3ChartDirectives', 'directedGraphModule','ExnodeService',
				  'appRoutes', 'MainCtrl', 'MainService','SocketService', 'EodnCtrl','jsTree.directive',
				  'FilesCtrl', 'DepotMapCtrl', 'DepotCtrl', 'DepotService'
//,'aggregateValue'
]
).run(function($rootScope, $http, $q, $timeout, $location, Socket, $route) {
  
  var ttl_wiggle = -5;

  getUniqueById = function(ary) {
    var curr = [];
    var ret = [];
    for(var i = 0; i < ary.length; i++) {
      if(curr.indexOf(ary[i].id) == -1) {
	curr.push(ary[i].id);
	ret.push(ary[i]);
      }
    }
    return ret;
  };
  
  getServiceName = function(service) {
    var name;
    if (typeof service.accessPoint != 'undefined') {
      name = ((service.accessPoint || "").split("://")[1] || "").split(":")[0] || "" 
    } else if (typeof service.name != 'undefined') {
      name = service.name
    }
    return name;
  }

  hasLocationInfo = function(service) {
    return (typeof service.location != 'undefined'
            && typeof service.location.longitude != 'undefined'
            && typeof service.location.latitude != 'undefined'
            && service.location.longitude != 0
            && service.location.latitude != 0)
  };
  
  updateServiceEntry = function(service) {
    var now = Math.round(new Date().getTime() / 1e3) // seconds
    service.ttl = Math.round(((service.ttl + (service.ts / 1e6)) - now));

    if (!hasLocationInfo(service)) {
      var url = "http://freegeoip.net/json/" + getServiceName(service);
      $http.get(url).
	success(function(data, status, headers, config) {
	  service.location = {
	    'latitude': data.latitude,
	    'longitude': data.longitude,
	    'state': data.region_code,
	    'country': data.country_code,
	    'zipcode': data.zip_code,
	    'city': data.city
	  };

	  $rootScope.ports.forEach(function(p) {
	    if (typeof p.properties.ipv4 != 'undefined'
	       && typeof service.listeners != 'undefined') {
	      service.listeners.forEach(function(l) {
		if (l.tcp.split("/")[0] == p.properties.ipv4.address)
		  service.location.institution = p.nodeRef.replace(/(.*)(domain=)(.*):.*$/, "$3");
	      })}
	  });
	}).
	error(function(data, status, headers, config) {
	  console.log("Error: ", status);
	})
    }
  };

  finish = function() {
    var services = $rootScope.services;
    services.forEach(function(s) {
      updateServiceEntry(s)
    });
    
    // set timer value
    onTimeout = function() {
      for(var i = 0; i < services.length; i++) {
	if(services[i].ttl == 0) {
	  services[i].status = 'Unknown';
	} else if(services[i].ttl < ttl_wiggle) {
	  services[i].status = 'OFF';
	} else {
	  services[i].status = 'ON';
	  services[i].ttl--;
	}
      }
      //continue timer
      timeout = $timeout(onTimeout, 1000);
    }
    
    // start timer
    var timeout = $timeout(onTimeout, 1000);   
  var $depotScope = window.$depotScope || {};
  $depotScope.services = $rootScope.services || [];
  $depotScope.measurements = $rootScope.measurements || [];
  $depotScope.metadata = $rootScope.metadata || [];
  $depotScope.nodes = $rootScope.nodes || [];
  $depotScope.ports = $rootScope.ports || [];
  };
  
  $q.all([
    $http.get('/api/nodes', { cache: true}),
    $http.get('/api/ports', { cache: true}),
    $http.get('/api/measurements', { cache: true}),
    $http.get('/api/metadata', { cache: true}),
    $http.get('/api/services', { cache: true})
  ]).then(function(res) {
    $rootScope.nodes = res[0].data;
    $rootScope.ports = res[1].data;
    $rootScope.measurements = res[2].data;
    $rootScope.metadata = res[3].data;
    $rootScope.services = getUniqueById(res[4].data);
    
    Socket.emit('node_request', {});
    Socket.emit('port_request', {});
    Socket.emit('measurement_request', {});
    Socket.emit('metadata_request', {});
    Socket.emit('service_request', {});    

    finish();
  });
});
