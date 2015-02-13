angular.module('aggregateValue', [])
  .controller('avController', function($scope, $rootScope, $filter) {
    $scope.services = $rootScope.services || [];
    getDepotCount = function() {
      return $filter('filter')($scope.services, { serviceType: 'ibp_server' }).length;
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
                 border-radius: 15px; padding: 10px; \
                 background-color: lightblue;"><p>{{type.text}}</p> \
                 <div class="{{dclass}}"/>{{services[0].ttl}}</div>',
      link: function(scope, element, attrs) {
	function updateValue() {
	  scope.dclass = "loader";
	}
	
	timeoutId = $interval(function() {
	  updateValue();
	}, 1000);

	updateValue();
      }
    };
  });