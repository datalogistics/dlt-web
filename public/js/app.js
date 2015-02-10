/*
 * Setup Our Angular App
 * public/js/
 * app.js
 */

angular.module('measurementApp', ['ngRoute', 'angular-loading-bar', 'ngAnimate',
				  'ui.utils' ,'ui.bootstrap', 'nvd3ChartDirectives', 'directedGraphModule',
				  'appRoutes', 'SliceCtrl', 'SliceService','SocketService', 'EodnCtrl','jsTree.directive','FilesCtrl',
				  'DepotMapCtrl', 'DepotCtrl', 'DepotService']
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
  
  setupServiceEntry = function(service) {
    var now = Math.round(new Date().getTime() / 1e3) // seconds
    service.ttl = Math.round(((service.ttl + (service.ts / 1e6)) - now));
  };

  finish = function() {
    var services = $rootScope.services;
    services.forEach(function(s) {setupServiceEntry(s)});
    
    // set timer value
    onTimeout = function() {
      for(var i = 0; i < services.length; i++) {
	if(services[i].ttl == 0) {
	  services[i].status = 'Unknown';
	} else if(services[i].ttl < ttl_wiggle) {
	  services[i].status = 'OFF';
	} else {
	  services[i].ttl--;
	}
      }
      //continue timer
      timeout = $timeout(onTimeout, 1000);
    }
    
    // start timer
    var timeout = $timeout(onTimeout, 1000);

    // switch view if necessary
    if($location.path() != "/status") {
      $location.path('/status');
    };

    // start listening for service updates
    Socket.emit('service_request', {});
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
    
    finish();
  });
});
