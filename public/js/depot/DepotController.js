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

function depotController($scope, $routeParams, $location, $filter, $rootScope, UnisService, DepotService,$modal,$window) {
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
      arrayData.max = 0;

      for (i=0; i< metadata.length; i++) {
        if (eventType === undefined) {
          eventType = metadata[i].eventType
        }
      }

      var chartconfig = getETSChartConfig(eventType);
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
          // Get the max in this array          
          arrayData.forEach(function(x) {
            if (x[1] > max) {
              max = x[1];
            };
          });
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
              if (arr[1] > arrayData.max) {
                arrayData.max = arr[1];
              }
              if (arr && arr[0] && arr[1]) {
                oldx = arr.x , oldy = arr.y;
                arrayData.push(arr);
              }
            }
          }
        });
        // Use the max to change graph text and formatter function as required
        if (isRate) {
          // Use arraydata max to scale graph
          var max = arrayData.max;
          var label = "Bytes ";
          var divValue = 1 ;
          if (max > 1e3 && max < 1e6) {
            // Make it kb
            label = "KBs";
            divValue = 1e3 ;
          } else if(max >= 1e6 && max < 1e9) {
            label = "MBs";
            divValue = 1e6;
          } else if (max >= 1e9) {
            label = "GBs";
            divValue = 1e9;
          }
          $scope.yAxisLabel = label + " per second";
          $scope.yAxisFormatFunction = function(){
            return function(d){
              return (d/divValue).toFixed(3);
            }
          }
        }
	
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
      var ss = 0 ;
      try{ ss = s.depot[md.eventType] || ss; } catch(e){};
      return arr.pop() + " (" + (ss/1e9).toFixed(0) + ")";
    }
    return arr.pop();
  };
  
  $scope.getServiceMetadata = function(service) {
    if (service.serviceType == "ibp_server") {
      return DepotService.depots[service.id].metadata;
    }
  };
  
  $scope.showData = function(metadata , name , buttonName) {
    // TODO add a way to configure which labels or event types open up in a dialog and which open in a new window
    // Maybe give a button which can be used to toggle behavior
    if (true) {
      var params = {
        id : metadata.id,
        name : name ,
        buttonName : buttonName
      }
      window.open('/popup/graphs?'+$.param(params),null, "width=600,height=420,resizable,scrollbars,status");
    } else {
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
	    return UnisService.init()
	  }
        }
      });
      modal.result.finally(function(){
        // Kill the socket
        UnisService.unsubDataId(metadata.id,"dialog");
      });
    }

    //$location.path('/depots/' + metadata.id);
  };
  
  $scope.showMap = function(service_id) {
    $location.path('/map/' + service_id);
  };
}
