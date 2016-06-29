function formatRate(ret) {
  var divValue,label; 
  if (ret > 1e3 && ret < 1e6) {
    // Make it kb
    label = "K";
    divValue = 1e3 ;
  } else if(ret >= 1e6 && ret < 1e9) {
    label = "M";
    divValue = 1e6;
  } else if (ret >= 1e9) {
    label = "G";
    divValue = 1e9;
  } else {
    divValue= 1;
    label = "B";
  }
  return (ret/divValue).toFixed(2) + " "+ label;
}
angular.module('avDirective', [])
  .controller('avController', function($scope, $rootScope, $filter, UnisService, DepotService) {
    getDepotCount = function() {
      var count = $filter('filter')(UnisService.services, { serviceType: 'ibp_server' }).length;
      // If count is 0 , its still loading 
      if (count > 0)
        return "<div class='avtext'>"+ count + "</div>";        
    };
    getNetworkUsage = function() {
      var ret = 0;
      Object.keys(DepotService.depots).forEach(function(key) {
	if (DepotService.depots[key][ETS.out]) {
      	  ret += Number(DepotService.depots[key][ETS.out]) || 0;
	}
      });
      var inret = 0;
      Object.keys(DepotService.depots).forEach(function(key) {
	if (DepotService.depots[key][ETS.in]) {
      	  inret += Number(DepotService.depots[key][ETS.in]) || 0;
	}
      });      

      return "<div>In : " + formatRate(inret) + "</div><div>" + "Out : "+ formatRate(ret)+"</div>";
    };
    getStorageUsed = function() {
      var ret = 0;
      Object.keys(DepotService.depots).forEach(function(key) {
	if (DepotService.depots[key][ETS.used]) {
      	  ret += DepotService.depots[key][ETS.used]
	}
      });
      return (ret/1e12);//.toFixed(2);
    };
    getStorageFree = function() {
      var ret = 0;
      Object.keys(DepotService.depots).forEach(function(key) {
	if (DepotService.depots[key][ETS.free]) {
      	  ret += DepotService.depots[key][ETS.free]
	}
      });
      return (ret/1e12);//.toFixed(2);
    };

    $scope.dcount = {'text': 'Depot Count',
		     'datafn': getDepotCount};
    $scope.dnet   = {'text': 'Network Usage',
		     'datafn': getNetworkUsage};
    $scope.dused  = {'text': 'Total Storage Used (TB)',
		     'datafn': getStorageUsed};
    $scope.dfree  = {'text': 'Total Storage Free (TB)',
		     'datafn': getStorageFree};
  })
  .directive('avElement', function($interval) {
    return {
      restrict: 'E',
      scope: {
	type: '=type'
      },
      template: '<div class="col-xs-5" style="border: 2px solid lightblue; \
                 border-radius: 15px; padding: 5px; height: 250px; \
                 background-color: lightblue;"><p>{{type.text}}</p> \
                 <div class="{{dclass}}" ng-bind-html="value"></div>',
      link: function(scope, element, attrs) {
	function updateValue() {
	  var val = scope.type.datafn();
          if (!val && val != 0) {
            scope.dclass = "loader";
          } else if (typeof val == "string") {
            scope.dclass = "avtext avstext";
	    scope.value  = val;
          } else {
            if (val > 0) {
	      scope.dclass = "avtext";
	      scope.value  = (Number(val)/1).toFixed(2);
	    }
	    else  {
	      scope.dclass = "loader";
	    }
          }
	}
	
	timeoutId = $interval(function() {
	  updateValue();
	}, 1000);

	updateValue();
      }
    };
  });
