function dltFormController($scope, $routeParams, $location, $rootScope, ExnodeService,$log) {

  $scope.searchModel = 'row';

  $scope.exFields = getSchemaProperties(window.exnodeScheme);
  // Date
  $scope.today = function() {
    $scope.dt = new Date();
  };
  $scope.today();

  $scope.clear = function () {
    $scope.dt = null;
  };

  $scope.toggleMin = function() {
    $scope.minDate = $scope.minDate ? null : new Date();
  };
  $scope.toggleMin();

  $scope.open = function($event) {
    $event.preventDefault();
    $event.stopPropagation();
    $scope.opened = true;
  };

  $scope.open2 = function($event) {
    $event.preventDefault();
    $event.stopPropagation();
    $scope.opened2 = true;
  };
  $scope.sensorNames = {
      "LANDSAT_8": "Landsat 8 OLI/TIRS",
      "LANDSAT_ETM_SLC_OFF" : "Landsat 7 SLC-off (2003 -&gt;)",
      "LANDSAT_ETM": "Landsat 7 SLC-on (1999-2003)",
      "LANDSAT_TM": "Landsat 4-5 TM",
      "LANDSAT_MSS2": "Landsat 4-5 MSS",
      "LANDSAT_MSS1": "Landsat 1-3 MSS",
      "LANDSAT_COMBINED": "Landsat 4-8 Combined"
    };

  $scope.dateOptions = {
    formatYear: 'yy',
    startingDay: 1
  };
  // Inlining the schema - Testing
  $scope.selectedExnode = false;
  $scope.setField = (function(x){
    $scope.selectedExnode = x;        
  });  

  // Slider 
  $scope.testOptions = {
    min: 5,
    max: 100,
    step: 5,
    precision: 2,
    orientation: 'horizontal',  // vertical
    handle: 'round', //'square', 'triangle' or 'custom'
    tooltip: 'show', //'hide','always'
    tooltipseparator: ':',
    tooltipsplit: false,
    enabled: true,
    naturalarrowkeys: false,
    range: false,
    ngDisabled: false,
    reversed: false
  };

  $scope.range = true;

  $scope.model = {
    first: 0,
    second: [],
    third: 0,
    fourth: 0,
    fifth: 0,
    sixth: 0,
    seventh: 0,
    eighth: 0,
    ninth: 0,
    tenth: 0
  };

  $scope.value = {
    first: $scope.testOptions.min + $scope.testOptions.step,
    second: [$scope.testOptions.min + $scope.testOptions.step, $scope.testOptions.max - $scope.testOptions.step],
    third: 0,
    fourth: 0,
    fifth: 0,
    sixth: 0,
    seventh: 0,
    eighth: 0,
    ninth: 0,
    tenth: 0
  };

  $scope.prefix = 'Current value: ';
  $scope.suffix = '%';
  $scope.formaterFn = function(value) {
    return $scope.prefix + value + $scope.suffix;
  };

  $scope.delegateEvent = null;
  $scope.slideDelegate = function ( value, event ) {
    if( angular.isObject(event) ) {
      $log.log('Slide delegate value on ' + event.type + ': ' + value);
    }
    else {
      $log.log('Slide delegate value: ' + event);
    }
    $scope.delegateEvent = event;
  };
}
