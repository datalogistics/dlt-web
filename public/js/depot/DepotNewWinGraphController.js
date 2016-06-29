function depotNewWinGraphController($scope, $routeParams, $location, $filter, $rootScope,$modal, UnisService) {
  console.log($routeParams);
  var metadata_id = $routeParams.id;
  var name = $routeParams.name;
  var buttonName = $routeParams.buttonName;
  if (metadata_id) {    
    $scope.eventType = [];
    $scope.metadataId = metadata_id;
    $scope.depotInstitutionName = name;
    $scope.dialogButtonName = buttonName;

    UnisService.getMetadataId(metadata_id, function(metadata) {
      var eventType = metadata.eventType;
      for (i=0; i< metadata.length; i++) {
        if (!eventType) {
          eventType = metadata[i].eventType;
        }
      }

      var arrayData = [];
      arrayData.max = 0;


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
              if (arr && (arr[0] || arr[0] == 0) &&  (arr[1]==0 || arr[1])) {
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
  }
}
