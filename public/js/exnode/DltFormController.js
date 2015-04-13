function dltFormController($scope, $routeParams, $location, $rootScope, ExnodeService,$log,$filter,SocketService) {
  
  // The usgs Model form
  var usf = $scope.usgsform = {
    startDate : "",
    endDate : "",
    sensorName : "" ,
    searchModel : 'row',
    cloud : 100 ,
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
        'south': usf.latStart,
        'north': usf.latEnd,
        'west': usf.longStart,
        'east': usf.longEnd
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

  $('body').popover({
    html: true,
    selector : ".imageSet .trigger",
    title: function () {
      return $(this).parent().find('.head').html();
    },
    content: function () {
      return $(this).parent().find('.content').html();
    }
  });
 
  $('body').on('click', '.usgsDownloadSelected', function(ev){
    var t = ev.target ;
    var arr = [];
    $(t).parents(".form").eq(0).find("input:checked").each(function(){
      arr.push($(this).val());
    });
    $scope.downloadSelectedImage(arr);
  });
  
  SocketService.on('exnode_data',function(data){
    var map = data.data ;
    var res = $scope.usgsSearchRes;
    for ( var i in map) {
      var exArr = map[i];
      for (var j = 0; j < exArr.length ; j++){        
        var it = exArr[j];
        var obj = res[i];
        if (obj) {
          obj.isExnode = true;
          var arr = obj.exFileArr = obj.exFileArr || [];
          obj.exMap = obj.exMap || {} ;
          if (!obj.exMap[it.name]){
            arr.push(it);
            obj.exMap[it.name] = true;
          }
          obj._exnodeData = it;
        }      
      };
    }
  });
  $scope.showModel = 'all';
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
    tooltip: 'hide', //'hide','always'
    tooltipseparator: ':',
    tooltipsplit: false,
    enabled: true,
    naturalarrowkeys: true,
    range: false,
    value : 100,
    ngDisabled: false,
    reversed: false
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

function shoppingCartController($scope, $routeParams, $location, $rootScope, ExnodeService,$log,$filter,SocketService) {
  $scope.cartRes = {};
  SocketService.emit('getShoppingCart', { username : 'indianadlt', password : 'indiana2014'});
  SocketService.on('cart_data_res', function(x) {
    console.log("Cart Data Res " ,x);
    var map = {};
    x.data.map(function(x) {
      map[x.entityId] = x;
      console.log(x.browseUrl);
    });
    $scope.cartRes = map;
  });
  
  SocketService.on('cart_nodata',function(data){
    // Bunch of ids with no data 
    var arr = data.data;
    var res = $scope.cartRes;
    arr.map(function(x) {
      var obj = res[x];
      if (obj)
        obj.isExnode = false;
    });
  });
  
  SocketService.on('cart_data',function(data){
    var map = data.data ;
    var res = $scope.cartRes;
    for ( var i in map) {
      var exArr = map[i];
      for (var j = 0; j < exArr.length ; j++){        
        var it = exArr[j];
        var obj = res[i];
        if (obj) {
          obj.isExnode = true;
          var arr = obj.exFileArr = obj.exFileArr || [];
          obj.exMap = obj.exMap || {} ;
          if (!obj.exMap[it.name]){
            arr.push(it);
            obj.exMap[it.name] = true;
          }
          obj._exnodeData = it;
        }      
      };
    }
  });
}
