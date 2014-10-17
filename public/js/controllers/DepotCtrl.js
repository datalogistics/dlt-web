/*
 * Depot Page Controller
 * public/js/controllers/
 * DepotCtrl.js
 */

angular.module('DepotCtrl', []).controller('DepotController', function($scope, $routeParams, $location, $rootScope, Depot, Socket) {

  var metadata_id = $routeParams.id;

  // place inital app data into scope for view
  $scope.services = $rootScope.services;
  $scope.measurements = $rootScope.measurements;
  $scope.metadata = $rootScope.metadata;

  // continue to listen for new data
  Socket.on('service_data', function(data) {

    if (typeof data =='string') {
      data = JSON.parse(data);
    }

    // data.status = 'New';
    console.log('Socket Service Request: ', data);

    var now = Math.round(new Date().getTime() / 1e3) //seconds
    data.ttl = Math.round(((data.ttl + (data.ts / 1e6)) - now));

    function searchServices(addService) {
      console.log("searchServices function");

      // search for duplicate id's
      for(var i = 0; $scope.services.length; i++) {

        if($scope.services[i].accessPoint == data.accessPoint) {
          // $scope.services[i].ttl = -1;
          console.log("removing: " + $scope.services[i].accessPoint + " ts: " + $scope.services[i].ts);
          $scope.services.splice(i, 1);
          break;
        }
      }

      // Call the callback
      addService();
    }

    function addService() {
      console.log("addService callback");

      // add new data to scope for view
      $scope.services.push(data);
    }

    searchServices(addService);
  });

  if (metadata_id) {
    Depot.getDataId(metadata_id, function(data) {
      $scope.data = $scope.data || [];

      if (typeof data =='string')
        data = JSON.parse(data);

      $scope.data = $scope.data.concat(data);

      Depot.getMetadata(metadata_id, function(metadata) {
        $scope.eventType = metadata.eventType;
      });

      var arrayData = [];
      angular.forEach($scope.data, function(key, value) {
          arrayData.push([key.ts, key.value]);
      });
	
      $scope.xAxisTickFormat_Date_Format = function(){
	  return function(d){
	      var ts = d/1e3;
	      return d3.time.format('%X')(new Date(ts));
	  }
      }

      $scope.yAxisFormatFunction = function(){
	  return function(d){
	      return (d/1e9).toFixed(2); // GB
	  }
      }

      $scope.graphData = [
      {
        "key": "Data Point",
        "values": arrayData
      }];
    });
  }

  $scope.getMetadataShortET = function(mid) {
      for (var i = 0; i<$scope.metadata.length; i++) {
	  if ($scope.metadata[i].id == mid) {
	      var arr = $scope.metadata[i].eventType.split(':');
	      return arr.pop();
	  }
      }
      return "N/A";
  };

  $scope.getServiceMeasurement = function(accessPoint) {
    var ip = accessPoint.split(':')[1].replace('//', '');

    for(var i = 0; i < $scope.measurements.length; i++) {
      if($scope.measurements[i].configuration.command) {
        if($scope.measurements[i].configuration.command.split(" ")[1] == ip) {
          return $scope.measurements[i].eventTypes;
        }
      }
    }
  };

  $scope.getServiceMetadata = function(accessPoint) {
    var ip = accessPoint.split(':')[1].replace('//', '');
    var metadatas = [];

    for(var i = 0; i < $scope.measurements.length; i++) {
      if($scope.measurements[i].configuration.command) {
        if($scope.measurements[i].configuration.command.split(" ")[1] == ip) {
          for(var j = 0; j < $scope.metadata.length; j++) {
            if($scope.metadata[j].parameters.measurement.href.split('/')[4] == $scope.measurements[i].id) {
              metadatas.push($scope.metadata[j].id);
            }
          }
        }
      }
    }
    return metadatas;
  };

  $scope.showData = function(metadata_id) {
    $location.path('/depots/' + metadata_id);
  };

  $scope.showMap = function(service_id) {
    $location.path('/eodn/' + service_id);
  };

});
