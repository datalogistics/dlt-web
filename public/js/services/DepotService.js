/*
 * Rest Services for Depot
 * public/js/services/
 * DepotService.js
 */

angular.module('DepotService', []).service('Depot', function($http, $timeout, $rootScope, Socket) {

  Socket.emit("depots_request",{});

  var stateServices = [];

  this.getServices = function(services) {
    $http.get('/api/services').success(function(data) {
      console.log('HTTP Service Request: ' , data);

      // set timer value
      onTimeout = function() {
        for(var i = 0; i < stateServices.length; i++) {
          if(stateServices[i].ttl <= 0) {
            stateServices[i].status = 'Unknown';
          } else {
            stateServices[i].ttl--;
          }
        }
        //continue timer
        timeout = $timeout(onTimeout,1000);
      }

      // save data
      stateServices = data;

      // start timer
      var timeout = $timeout(onTimeout,1000);

      // return data
      services(data);
    }).error(function(data) {
      console.log('HTTP Service Error: ' ,  data);
    });
  };

  this.getNodes = function(nodes) {
    $http.get('/api/nodes').success(function(data) {
      console.log('HTTP Node Request: ' , data);
      nodes(data);
    }).error(function(data) {
      console.log('HTTP Node Error: ' , data);
    });
  };

  this.getMeasurements = function(measurements) {
    $http.get('/api/measurements').success(function(data) {
      console.log('Measurement Request: ' + data);
      measurements(data);
    }).error(function(data) {
      console.log('Measurement Error: ' + data);
    });
  };

  this.getMeasurement = function(id, measurement) {
    $http.get('/api/measurements/' + id)
      .success(function(data) {
        console.log('Measurement Request: ' + data);
        measurement(data);
      })
      .error(function(data) {
        console.log('Measurement Error: ' + data);
      });
  };

  this.getMetadatas = function(metadata) {
    $http.get('/api/metadata').success(function(data) {
      console.log('Metadata Request: ' + data);
      metadata(data);
    }).error(function(data) {
      console.log('Metadata Error: ' + data);
    });
  };

  this.getMetadata = function(id, metadata) {
    $http.get('/api/metadata/' + id)
      .success(function(data) {
        console.log('Metadata Request: ' + data);
        metadata(data);
      })
      .error(function(data) {
        console.log('Metadata Error: ' + data);
      });
  };

  this.getData = function(id, data) {
    $http.get('/api/data/' + id).success(function(data_request) {
      console.log('Data Request: ' + data_request);
      data(data_request);

      Socket.on('depots_data',function(data){
        console.log('depots Data Request: ' , data);
        data(data_request);
      });
    }).error(function(data_request) {
      console.log('Data Error: ' + data);
    });
  };

});
