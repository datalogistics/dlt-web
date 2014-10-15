/*
 * Setup Our Angular App
 * public/js/
 * app.js
 */

angular.module('measurementApp', ['ngRoute', 'ngAnimate',
  'ui.utils' ,'ui.bootstrap', 'nvd3ChartDirectives', 'directedGraphModule',
  'appRoutes', 'SliceCtrl', 'SliceService', 'NodeCtrl', 'NodeService', 'ServiceCtrl',
  'ServiceService', 'MeasurementCtrl', 'MeasurementService', 'MetadataCtrl', 'MetadataService',
  'PortService', 'SocketService', 'EodnCtrl', 'DepotCtrl', 'DepotService']
  ).run(function($rootScope, $http, $q, $timeout, Socket) {
    $http.get('/api/services').success(function(data) {
      Socket.emit('service_request', {});
      Socket.emit('measurement_request', {});
      Socket.emit('metadata_request', {});

      console.log('HTTP Service Request: ' , data);
      console.log(data.length);

      var unqiueServices = [];
      var services = [];

      for(var i = 0; i < data.length; i++) {
        if(unqiueServices.indexOf(data[i].id) == -1) {
          unqiueServices.push(data[i].id);
        }
      }

      console.log(unqiueServices.length);
      console.log(unqiueServices);

      getServices = function() {
        var promises = [];

        for(var i = 0; i < unqiueServices.length; i++) {
          promises.push($http.get('/api/services/' + unqiueServices[i]).success(function(data) {
            console.log('HTTP Service Request: ' , data);
            services.push(data);
          }));
        }
        return $q.all(promises);
      };

      getServices().then(function(data) {
        console.log(data.length);
        console.log(data);

        // set timer value
        onTimeout = function() {
          for(var i = 0; i < services.length; i++) {
            if(services[i].ttl <= 0) {
              services[i].status = 'Unknown';
            } else {
              services[i].ttl--;
            }
          }
          //continue timer
          timeout = $timeout(onTimeout,1000);
        }

        // start timer
        var timeout = $timeout(onTimeout,1000);

        // apply data to scope
        $rootScope.services = services;
      });
    });

    $http.get('/api/measurements').success(function(data) {
      console.log('Measurement Request: ' + data);
      $rootScope.measurements = data;
    }).error(function(data) {
      console.log('Measurement Error: ' + data);
    });

    $http.get('/api/metadata').success(function(data) {
      console.log('Metadata Request: ' + data);
      $rootScope.metadata = data;
    }).error(function(data) {
      console.log('Metadata Error: ' + data);
    });
  });
