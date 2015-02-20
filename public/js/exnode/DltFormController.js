function dltFormController($scope, $routeParams, $location, $rootScope, ExnodeService,$log,$filter,SocketService) {
  
  // The usgs Model form
  var usf = $scope.usgsform = {
    startDate : "",
    endDate : "",
    sensorName : "" ,
    searchModel : 'row',
    cloud : "" ,
    isSeasonal : false,
    latStart : "" , latEnd : "" ,
    longStart : "" , longEnd: "",    
    rowStart : "" , rowEnd : "",
    pathStart : "", pathEnd : ""
  };

  function toMMFormat(date){
    return $filter('date')(date, "MM/dd/yyyy");
  };
  $scope.isUsgsLoading = false;
  $scope.submitUsgsForm = function(){
    console.log(usf);    
    $scope.isUsgsLoading = true;
    if (usf.searchModel == 'row'){
      SocketService.emit('usgs_row_search', {
        'sensor_name':usf.sensorName,
        'start_date': toMMFormat(usf.startDate),
        'end_date': toMMFormat(usf.endDate),
        'cloud_cover': usf.cloud ,
        'seasonal': usf.isSeasonal,
        'aoi_entry':'path_row',
        'begin_path': usf.pathStart,
        'end_path': usf.pathEnd,
        'begin_row': usf.rowStart,
        'end_row': usf.rowEnd,
        'output_type':'unknown'
      });
    } else {
      SocketService.emit('usgs_lat_search', {
        'sensor_name':usf.sensorName,
        'start_date': toMMFormat(usf.startDate),
        'end_date': toMMFormat(usf.endDate),
        'cloud_cover': usf.cloud ,
        'seasonal': usf.isSeasonal,
        'north': usf.latStart,
        'south': usf.latEnd,
        'west': usf.latStart,
        'east': usf.latEnd
      });        
    }
  };
  SocketService.on('usgs_lat_res',function(data){
    $scope.isUsgsLoading = false;
    console.log(data);
  });
  SocketService.on('usgs_row_res',function(data){
    $scope.isUsgsLoading = false;
    var r = {};
    var data = (data || []);
    
    var dataAsTreeArr = data.map(function(x,i) {
      x.name = x.sceneID;
      x._treeIndex = i ;
      r[x.name] = x;                 
      return  $.extend(x, {
        "id" : x.name ,
        "text" : x.name,
        "icon" :   "/images/file.png" ,
        "parent" :  "#" ,
        "children" : false
      });   
    });
    
    $scope.isUsgsSearched = true;
    console.log("Search Results ",r , data);
    if (!r) {
      usgsSearchRes = false ;
    };
    for (var i in r){
      SocketService.emit('exnode_request',{name : i});
    };
    // Convert the data into e/api/usgssearch?xpected form 
    $scope.usgsSearchRes = r;      
    $scope.usgsSearchResAsArr = dataAsTreeArr;
    console.log(dataAsTreeArr);
  });
  
  SocketService.on('exnode_data',function(data){    
    if (data && data.length > 0){      
      var k = $scope.usgsSearchRes[(data[0].name || "").split(".")[0]];
      k.isPresentInExnode = true;
      k._exData = data;
      console.log("Exnode data ",arguments);
    } 
  });
  /*
    $scope.submitUsgsForm = function(){
    console.log(usf);    
    ExnodeService.searchUsgsRow({
    'sensor_name':usf.sensorName,
    'start_date': toMMFormat(usf.startDate),
      'end_date': toMMFormat(usf.endDate),
      'cloud_cover': usf.cloud ,
      'seasonal': usf.isSeasonal,
      'aoi_entry':'path_row',
      'begin_path': usf.pathStart,
      'end_path': usf.pathEnd,
      'begin_row': usf.rowStart,
      'end_row': usf.rowEnd,
      'output_type':'unknown'
    }).success(function(data){      
      data = data.searchResponse || [];      
      var r = (data.metaData || []).map(function(x) {
        for (var i in x) {
          if($.isArray(x[i]) && x[i].length == 1){
            x[i] = x[i][0];
          }
        };
        x.name = x.sceneID;
        return x;
      });
      $scope.isUsgsSearched = true;
      console.log("Search Results ",r);
      if (!r) {
        usgsSearchRes = false ;
      };
      // Convert the data into e/api/usgssearch?xpected form 
      $scope.usgsSearchRes = r;      
    });
      // /api/usgssearch?sensor_name=LANDSAT_8&start_date=07/21/1982&end_date=02/18/2015&cloud_cover=100&seasonal=false&aoi_entry=path_row&begin_path=12&end_path=12&begin_row=1&end_row=3&output_type=unknown
  };*/

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
  $scope.showImage = function(img,ev){
    console.log("Show image ",img);
    $(ev.target).ekkoLightbox();
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
