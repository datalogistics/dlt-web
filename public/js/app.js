/*
 * Setup Our Angular App
 * public/js/
 * app.js
 */

angular.module('measurementApp', ['ngRoute', 'angular-loading-bar', 'ngAnimate',
  'ui.utils' ,'ui.bootstrap', 'nvd3ChartDirectives', 'directedGraphModule',
  'appRoutes', 'SliceCtrl', 'SliceService','SocketService', 'EodnCtrl','jsTree.directive','FilesCtrl',
  'DepotCtrl', 'DepotService']
  ).run(function($rootScope, $http, $q, $timeout, $location, Socket, $route) {

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
      
      finish = function() {
	  var services = $rootScope.services;

	  console.log('Loading complete, redirecting');
          if(!$rootScope.gotoSomeotherPage) {
              $location.path('/status');
              $rootScope.services = services;
              console.log('root scoping service');
              $rootScope.gotoSomeotherPage = false ;
          }
	  
          // set timer value
          onTimeout = function() {
              for(var i = 0; i < services.length; i++) {
		  if(services[i].ttl == 0) {
		      services[i].status = 'Unknown';
		  } else if(services[i].ttl < 0) {
		      services[i].status = 'OFF';
		  } else {
		      services[i].ttl--;
		  }
              }
              //continue timer
              timeout = $timeout(onTimeout, 1000);
          }
          
          $rootScope.services = services;
          // set ttl value
          for(var i = 0; i < services.length; i++) {
              var now = Math.round(new Date().getTime() / 1e3) //seconds
              //console.log("Current time " + now);
              services[i].ttl = Math.round(((services[i].ttl + (services[i].ts / 1e6)) - now));
          }
	  
          // start timer
          var timeout = $timeout(onTimeout, 1000);
          if(!$rootScope.gotoSomeotherPage) {
              // I dont why this is needed
              $route.reload();
              $location.path('/status');
          };
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
