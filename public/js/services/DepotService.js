/*
 * Rest Services for Depot
 * public/js/services/
 * DepotService.js
 */

angular.module('DepotService', []).service('Depot', function($http, Socket) {

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

  this.getData = function(data) {
    Socket.on('data_data',function(data_request) {
      console.log('Incoming Service Depot Data: ' , data_request);
      data(data_request);
    });
  };

  this.getDataId = function(id, data) {
    Socket.emit('data_id_request', {id: id});

    $http.get('/api/data/' + id).success(function(data_request) {
      console.log('Data Request: ' + data_request);
      data(data_request);

      Socket.on('data_id_data',function(data_request) {
        console.log('Incoming Service Depot Data: ' , data_request);
        data(data_request);
      });
    }).error(function(data_request) {
      console.log('Data Error: ' + data);
    });
  };

});
