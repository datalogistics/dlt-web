/*
 * Depot Controller
 * public/js/depot/
 * DepotController.js
 */

function depotController($scope, $routeParams, $location, $rootScope, UnisService, DepotService) {
  var SHOW_ETS = ['ps:tools:blipp:ibp_server:resource:usage:used',
	          'ps:tools:blipp:ibp_server:resource:usage:free',
	          'ps:tools:blipp:linux:cpu:utilization:user',
	          'ps:tools:blipp:linux:cpu:utilization:system'];

  var format_timestamp = function(){
    return function(d){
      var ts = d/1e3;
      return d3.time.format('%X')(new Date(ts));
    }
  }

  var format_GB = function(){
    return function(d){
      return (d/1e9).toFixed(2); // GB
    }
  }

  var format_percent = function() {
    return function(d) {return (d*100).toFixed(2)}
  }

  var ETS_CHART_CONFIG = 
     {"ps:tools:blipp:ibp_server:resource:usage:used" : {selector: "#CHART-Time-GB", xformat: format_timestamp, yformat: format_GB},
      "ps:tools:blipp:ibp_server:resource:usage:free" :{selector: "#CHART-Time-GB", xformat: format_timestamp, yformat: format_GB},
      "ps:tools:blipp:linux:cpu:utilization:user": {selector: "#CHART-Time-Percent", xformat: format_timestamp, yformat: format_percent},
      "ps:tools:blipp:linux:cpu:utilization:system":{selector: "#CHART-Time-Percent", xformat: format_timestamp, yformat: format_percent}}

  var metadata_id = $routeParams.id;
  
  // place inital UnisService data into scope for view
  $scope.services = UnisService.services || [];
  $scope.measurements = UnisService.measurements || [];
  $scope.metadata = UnisService.metadata || [];
  $scope.nodes = UnisService.nodes || [];
  $scope.ports = UnisService.ports || [];

  if (metadata_id != null) {

    $scope.eventType = [];

    UnisService.getMetadataId(metadata_id, function(metadata) {
      $scope.eventType = metadata.eventType;
      var eventType;

      for (i=0; i< metadata.length; i++) {
        if (eventType === undefined) {
          eventType = metadata[i].eventType
        }
      }

      var chartconfig = ETS_CHART_CONFIG[eventType]
      d3.select(chartconfig.selector).attr("style", "")

      UnisService.getDataId(metadata_id, function(data) {
        $scope.data = $scope.data || [];

        if (typeof data =='string') {data = JSON.parse(data);}

        $scope.data = $scope.data.concat(data);

        var arrayData = [];
        angular.forEach($scope.data, function(key, value) {
          arrayData.push([key.ts, key.value]);
        });

        $scope.xAxisTickFormat_Date_Format = chartconfig.xformat;
        $scope.yAxisFormatFunction = chartconfig.yformat;

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

  $scope.getServiceMeasurement = function(sref) {
    for(var i = 0; i < $scope.measurements.length; i++) {
	if($scope.measurements[i].service == sref) {
            return $scope.measurements[i].eventTypes;
        }
    }
  };

  $scope.getServiceMetadata = function(service) {
    var metadatas = [];
    var seen_ets = [];

    // this case is brutal because our metadata is missing subject hrefs
    // perhaps can fix in blipp for IDMS
    if (service.serviceType == 'ibp_server') {
	var ip = service.accessPoint.split(':')[1].replace('//', '');
	for(var i = 0; i < $scope.measurements.length; i++) {
	    if($scope.measurements[i].configuration.command) {
		if($scope.measurements[i].configuration.command.split(" ")[1] == ip) {
		    for(var j = 0; j < $scope.metadata.length; j++) {
			if ((seen_ets.indexOf($scope.metadata[j].eventType) == -1) &&
			    ($scope.metadata[j].parameters.measurement.href.split('/')[4] == $scope.measurements[i].id)) {
			    metadatas.push($scope.metadata[j]);
			    seen_ets.push($scope.metadata[j].eventType);
			}
		    }
		}
	    }
	}
    }
    else {
	for(var i = 0; i < $scope.measurements.length; i++) {
            if($scope.measurements[i].service == service.selfRef) {
		for(var j = 0; j < $scope.metadata.length; j++) {
		    if($scope.metadata[j].parameters.measurement.href == $scope.measurements[i].selfRef) {
			if ((seen_ets.indexOf($scope.metadata[j].eventType) == -1) &&
			    (SHOW_ETS.indexOf($scope.metadata[j].eventType) >= 0)) {
			    metadatas.push($scope.metadata[j]);
			    seen_ets.push($scope.metadata[j].eventType);
			}
		    }
		}
            }
	}
    }
    return metadatas;
  };

  $scope.showData = function(metadata) {
    $location.path('/depots/' + metadata.id);
  };

  $scope.showMap = function(service_id) {
    $location.path('/map/' + service_id);
  };
}
