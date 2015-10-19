/*
 * Depot Controller
 * public/js/depot/
 * DepotController.js
 */
function getRate(x,y,oldx,oldy) {
  var timeD = x/1e6 - oldx/1e6;
  if (oldx >= x || timeD == 0) {
    console.log("No Change");
    return [];
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

function depotController($scope, $routeParams, $location, $filter, $rootScope, UnisService, DepotService,$modal,$window,$q) {
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
  /**
   Group services by parameter - Keep watching services and group them by location
   */
  var currentKey = "location"; // Can be anyother property
  $scope.$watch('services', function(serv) {
    // TODO No need to use filter - just add the query to the URL in services
    var services = $filter('filter')(serv.slice(0),{serviceType: 'ibp_server'}) || [];    
    $scope.groupedServiceMap = services.reduce(function (y,x) {
      var key = x[currentKey];
      // Special casing location - Could technically just try to put this into its toString method
      if (currentKey == "location") {
        var k  = (key.city || "") + " "  + (key.state || "");        
        key = k.trim();
      };
      if (!y[key]) {
        y[key] = y[key] || [];
      };
      console.log(key,x);
      y[key].push(x);
      return y;
    },{});
  });  
  
  if (metadata_id != null) {
    $scope.eventType = [];
    /** Seems to be used only for graph **/
    UnisService.getMetadataId(metadata_id, function(metadata) {
      var eventType = metadata.eventType;
      var arrayData = [];
      arrayData.max = 0;
      
      // Select last eventType of metadata
      var chartconfig = getETSChartConfig(eventType);
      d3.select(chartconfig.selector).attr("style", "");
      
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
        var spliceCount = 0;
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
                spliceCount++;
                oldx = arr.x , oldy = arr.y;
                arrayData.push(arr);
              }
            }
          }
        });
        // Splice the existing array by that many entries so that the graph actually moves instead of compressing
        // There might be a much better way to do this, e.g time difference based - this causes ugly shakes
        arrayData.splice(0,spliceCount);

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

  $scope.getButtonName = function(md, s) {
    var arr = md.eventType.split(':');
    return arr.pop();
  };

  $scope.getMetadataShortET = function(md, s) {
    var arr = md.eventType.split(':');
    if (MY_ETS.indexOf(md.eventType) >= 0) {
      var ss = 0 ;
      if (/network:/.test(md.eventType)) {        
        try{ ss = ((s.depot[md.eventType] || ss)/1).toFixed(0);} catch(e){};
        var divValue,label; 
        if (ss > 1e3 && ss < 1e6) {
          // Make it kb
          label = "K";
          divValue = 1e3 ;
        } else if(ss >= 1e6 && ss < 1e9) {
          label = "M";
          divValue = 1e6;
        } else if (ss >= 1e9) {
          label = "G";
          divValue = 1e9;
        } else {
          divValue= 1;
          label = "B";
        }
        ss = (ss/divValue).toFixed(2) + " "+ label;
      }
      else {
        try{ ss = (s.depot[md.eventType]/1e9).toFixed(0);
	     if (Number.isNaN(ss) || ss == "NaN")
	       ss = "N/A";
	   } catch(e){
	  ss = "N/A";
	};
      }
      return arr.pop() + " (" + ss + ")";
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
      };
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

  function updateService(ser,dat) {
    if (dat &&  !dat.error) {
      var data = dat.data || {};
      if (ser.ttl && ser.ttl < 200)
	ser.ttl = 200;
      ser.depot['ps:tools:blipp:ibp_server:resource:usage:used'] = data.totalUsed;
      ser.depot['ps:tools:blipp:ibp_server:resource:usage:free'] = data.totalFree;
    } else {
      // Kill the depot - Can't find data
      ser.ttl = ser.depot['ps:tools:blipp:ibp_server:resource:usage:free']  = ser.depot['ps:tools:blipp:ibp_server:resource:usage:used'] = 0;
    }
  }
  $scope.runGetVersion = function(ser,ev) {
    var url = ser.accessPoint;
    var target = ev.target;
    $(target).removeClass("alert-warning alert-success alert-danger");
    $(target).addClass("alert-warning");
    UnisService.getVersionByUrl(url)
      .then(function(data) {
	updateService(ser,data);
	$(target).removeClass("alert-warning alert-success alert-danger");
	$(target).addClass("alert-success");
      })
      .catch(function() {	
	$(target).removeClass("alert-warning alert-success alert-danger");
	$(target).addClass("alert-danger");
      });
  };

  $scope.showGetVersionRes = function(ser,ev) {
    var url = ser.accessPoint;
    var modScope ;
    var prom = $q.defer();
    var modalInstance = $modal.open({
      templateUrl: "getVersionModal.html",
      controller: function($scope) {	  
        $scope.cancel = function() {
          modalInstance.dismiss();
        };
	modScope = $scope;
	prom.resolve($scope);
	$scope.isLoading = true;
      }
    });
    UnisService.getVersionByUrl(url,true).then(function(data) {
      prom.promise.then(function(modScope){ 
	modScope.isLoading = false;
	modScope.getVersionRaw = data.data.rawData;
      });
    });
    var tmpl = $("#getVersionModal.html");
  };
}











