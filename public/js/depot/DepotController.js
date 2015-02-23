/*
 * Depot Controller
 * public/js/depot/
 * DepotController.js
 */

function depotController($scope, $routeParams, $location, $filter, $rootScope, UnisService, DepotService) {
  var SHOW_ETS = ['ps:tools:blipp:ibp_server:resource:usage:used',
	          'ps:tools:blipp:ibp_server:resource:usage:free',
	          'ps:tools:blipp:linux:cpu:utilization:user',
	          'ps:tools:blipp:linux:cpu:utilization:system'];

  var metadata_id = $routeParams.id;
  
  // place inital UnisService data into scope for view
  $scope.services = $filter('filter')(UnisService.services, { serviceType: 'ibp_server' }) || [];
  $scope.measurements = UnisService.measurements || [];
  $scope.metadata = UnisService.metadata || [];
  $scope.nodes = UnisService.nodes || [];
  $scope.ports = UnisService.ports || [];

  if (metadata_id != null) {

    $scope.eventType = [];

    UnisService.getMetadataId(metadata_id, function(metadata) {
      var eventType = metadata.eventType;
      var arrayData = [];
      
      for (i=0; i< metadata.length; i++) {
        if (eventType === undefined) {
          eventType = metadata[i].eventType
        }
      }

      var chartconfig = ETS_CHART_CONFIG[eventType]
      d3.select(chartconfig.selector).attr("style", "")

      UnisService.getDataId(metadata_id, null, function(data) {
        if (typeof data =='string') {
	  data = JSON.parse(data);
	}
	
	if (Object.prototype.toString.call(data) === '[object Array]') {
          angular.forEach(data.reverse(), function(key, value) {
            arrayData.push([key.ts, key.value]);
          });

          $scope.xAxisTickFormat_Date_Format = chartconfig.xformat;
          $scope.yAxisFormatFunction = chartconfig.yformat;
	  $scope.eventType = eventType;
	}
	else {
	  angular.forEach(data[metadata_id], function(key, value) {
            arrayData.push([key.ts, key.value]);
          });
	}
        
	// should not rely on the scope here or above
	$scope.graphData = [
          {
            "key": "Data Point",
            "values": arrayData
          }];	 
      });
    });
  }
  
  $scope.getMetadataShortET = function(md) {
      var arr = md.eventType.split(':');
      return arr.pop();
  };

  $scope.getServiceMetadata = function(service) {
    return DepotService.depots[service.id].metadata;
  };
  
  $scope.showData = function(metadata) {
    $location.path('/depots/' + metadata.id);
  };
  
  $scope.showMap = function(service_id) {
    $location.path('/map/' + service_id);
  };
}
