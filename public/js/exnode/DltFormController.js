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
  
  function handleUsgsData(data){
    $scope.isUsgsLoading = false;
    var r = {};
    var data = (data || []);
    console.debug("Data rec " ,data);
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

    var sceneIdArr = data.map(function(x){return x.name;});
    SocketService.emit('exnode_request',{sceneId : sceneIdArr});    
    
    // Convert the data into e/api/usgssearch?xpected form 
    $scope.usgsSearchRes = r;      
    $scope.usgsSearchResAsArr = dataAsTreeArr;
    console.log(dataAsTreeArr);
  };
  SocketService.on('usgs_lat_res',handleUsgsData);
  SocketService.on('usgs_row_res',handleUsgsData);
  
  SocketService.on('exnode_nodata',function(data){
    // Bunch of ids with no data 
    var arr = data.data;
    var res = $scope.usgsSearchRes;
    arr.map(function(x) {
      var obj = res[x];
      if (obj)
        obj.isExnode = false;
    });
  });
  
  SocketService.on('exnode_data',function(data){
    var map = data.data ;
    var res = $scope.usgsSearchRes;
    for ( var i in map) {
      var it = map[i];
      var obj = res[i];
      if (obj) {
        obj.isExnode = true;
        obj._exnodeData = it;
      }
    };     
  });

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
  $scope.showImage = function(ev){
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
