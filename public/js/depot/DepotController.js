/*
 * Depot Controller
 * public/js/depot/
 * DepotController.js
 */
function getRate(x,y,oldx,oldy) {
  var timeD = x/1e6 - oldx/1e6
  if (oldx >= x || timeD == 0) {
    console.log("No Change");
    return;
  }  
  // Now use this old value to calculate rate 
  var yVal = (y - oldy) / timeD;
  var xVal = x;
  var newArr = [xVal,yVal];
  // Hitch orignal values to this array
  newArr.x = x;
  newArr.y = y;
  return newArr;
}

function depotController($scope, $routeParams, $location, $filter, $rootScope, UnisService, DepotService,$modal) {
  var SHOW_ETS = ['ps:tools:blipp:ibp_server:resource:usage:used',
	          'ps:tools:blipp:ibp_server:resource:usage:free',
	          'ps:tools:blipp:linux:cpu:utilization:user',
	          'ps:tools:blipp:linux:cpu:utilization:system'];
  
  var metadata_id = $scope.metadataId || $routeParams.id; //
  
  // place inital UnisService data into scope for view
  $scope.services = UnisService.services || [];
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
        var isAbsolute = true , isRate = false ;
        if (/network:/.test(eventType)) {
          // Show graph as rate
          isAbsolute = false ;
          isRate = true;
        }
        var arr = [];
        if ($.isArray(data)) {
          arr = data.reverse();
          $scope.xAxisTickFormat_Date_Format = chartconfig.xformat;
          $scope.yAxisFormatFunction = chartconfig.yformat;
	  $scope.eventType = eventType;
        } else {
          arr = data[metadata_id];
          // Splice the existing array by that many entries so that the graph actually moves instead of compressing
          // There might be a much better way to do this, e.g time difference based - this causes ugly shakes
          arrayData.splice(0,arr.length);
        };
        
        if (isRate){
          $scope.yAxisLabel= "Bytes per second";
        }
        var oldx, oldy;  
        arr.forEach(function(key) {
          var x = Number(key.ts);
          var y = Number(key.value);
          if (isAbsolute) {
            arrayData.push([x,y]);
          } else if (isRate) {            
            if (!oldx) {
              oldx = x , oldy = y;
            } else {
              var arr = getRate(x,y,oldx,oldy);
              if (arr && arr[0] && arr[1]) {
                oldx = arr.x , oldy = arr.y;
                arrayData.push(arr);
              }
            }
          }
        });
	
	// should not rely on the scope here or above
	$scope.graphData = [
          {
          "key": "Data Point",
          "values": arrayData
        }];	 
      },"dialog");
    });
    $scope.metadataId = undefined;
  }
  
  $scope.getMetadataShortET = function(md, s) {
    var arr = md.eventType.split(':');
    if (MY_ETS.indexOf(md.eventType) >= 0) {
      return arr.pop() + " (" + (s.depot[md.eventType]/1e9).toFixed(0) + ")";
    }
    return arr.pop();
  };
  
  $scope.getServiceMetadata = function(service) {
    if (service.serviceType == "ibp_server") {
      return DepotService.depots[service.id].metadata;
    }
  };
  
  $scope.showData = function(metadata , name , buttonName) {
    $scope.metadataId = metadata.id;
    $scope.depotInstitutionName = name;
    $scope.dialogButtonName = buttonName;
    var modal = $modal.open({
      templateUrl: '/views/depot_data.html',
      controller: 'DepotController',
      scope : $scope ,
      size : 'lg',
      resolve: {
	'unis': function(UnisService) {
	  return UnisService.init
	}
      }
    });
    modal.result.finally(function(){
      // Kill the socket
      UnisService.unsubDataId(metadata.id,"dialog");
    });
    //$location.path('/depots/' + metadata.id);
  };
  
  $scope.showMap = function(service_id) {
    $location.path('/map/' + service_id);
  };
}
