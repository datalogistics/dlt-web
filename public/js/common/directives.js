angular.module('avDirective', [])
  .controller('avController', function($scope, $rootScope, $filter, UnisService) {
    getDepotCount = function() {
      return $filter('filter')(UnisService.services, { serviceType: 'ibp_server' }).length;
    };
    getNetworkUsage = function() {
      return 0;
    };
    getStorageUsed = function() {
      return 0;
    };
    getStorageFree = function() {
      return 0;
    };

    $scope.dcount = {'text': 'Depot Count',
		     'datafn':  getDepotCount};
    $scope.dnet   = {'text': 'Network Usage',
		     'datafn': getNetworkUsage};
    $scope.dused  = {'text': 'Total Storage Used',
		     'datafn': getStorageUsed};
    $scope.dfree  = {'text': 'Total Storage Free',
		     'datafn': getStorageFree};
  })
  .directive('avElement', function($interval) {
    return {
      restrict: 'E',
      scope: {
	type: '=type'
      },
      template: '<div class="col-xs-5" style="border: 2px solid lightblue; \
                 border-radius: 15px; padding: 10px; height: 300px; \
                 background-color: lightblue;"><p>{{type.text}}</p> \
                 <div class="{{dclass}}">{{value}}</div>',
      link: function(scope, element, attrs) {
	function updateValue() {
	  var val = scope.type.datafn();
	  if (val) {
	    scope.dclass = "avtext";
	    scope.value  = val;
	  }
	  else  {
	    scope.dclass = "loader";
	  }
	}
	
	timeoutId = $interval(function() {
	  updateValue();
	}, 1000);

	updateValue();
      }
    };
  });