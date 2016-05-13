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
  var today = new Date();
  //$scope.maxDate = $filter('date')(today, 'yyyy-MM-dd');
  $scope.maxDate = today;
  $scope.isUsgsLoading = false;
  $scope.submitUsgsForm = function(){
    console.log(usf);    
    $scope.isUsgsLoading = true;
    if (usf.searchModel == 'row'){
      SocketService.emit('usgs_row_search', {
        'sensor':usf.sensorName,
        'start_date': toMMFormat(usf.startDate),
        'end_date': toMMFormat(usf.endDate),
        'cloud_cover': usf.cloud ,
        'seasonal': usf.isSeasonal,
        'aoi_entry':'path_row',
        'start_path': usf.pathStart,
        'end_path': usf.pathEnd,
        'start_row': usf.rowStart,
        'end_row': usf.rowEnd,
	'format' : 'xml'
      });
    } else {
      SocketService.emit('usgs_lat_search', {
        'sensor':usf.sensorName,
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
    trigger : "click",
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

var USGS_KEY_NAME = 'usgsApiKey';
var USGS_KEY_TIME = 'usgsApiKeyTime';
// Valid for 10 hours
var USGS_TIME_DIFF = 3600 * 10;
function shoppingCartController($scope, $routeParams, $location, $rootScope, ExnodeService,$log,$filter,SocketService) {
  $scope.usgs = {}; 
  $scope.cartRes = {};
  $scope.isShoppingCartLoading = false;
  var existing_key = localStorage.getItem(USGS_KEY_NAME);
  var existing_time = localStorage.getItem(USGS_KEY_TIME);
  var timeDiff = new Date().getTime() - existing_time;  
  if (timeDiff > 0 && (timeDiff / 1000) < USGS_TIME_DIFF) {
    console.log("Key Still valid ");
    $scope.hideLogin = true;
    populate_cart_with_key(existing_key);
  } else {
    localStorage.setItem(USGS_KEY_NAME,"");
    existing_key = null;
    // localStorage.setItem(USGS_KEY_TIME,new Date().getTime());
  }
  function populate_cart_with_key(key) {
    SocketService.emit('getShoppingCart',{token : key , isToken : true});
    $scope.cartRes = {};
    $scope.isShoppingCartLoading = true;
    $scope.hideLogin = true;
  }
  function populate_cart(uname , pwd) {    
    SocketService.emit('getShoppingCart',{username : uname, password : pwd});
    $scope.cartRes = {};
    $scope.isShoppingCartLoading = true;
    $scope.hideLogin = true;
  }
  $scope.showLogin = function() {
    $scope.tryAnotherLogin = true;
    $scope.usgsShoppingNoData = false;
    $scope.loginFailed = false;
    $scope.hideLogin = false;
  };
  $scope.deleteOrder = function(orderId) {
    SocketService.emit('deleteOrderGroup',{token : existing_key,isToken: true,orderId : orderId});
    populate_cart_with_key(existing_key);
  };
  
  $scope.loginAndPopulateCart = function(e) {
    var username = $(e.target).find("input[name=username]").val();
    var password = $(e.target).find("input[name=password]").val();
    $scope.loginFailed = false;
    populate_cart(username,password);
  };
  //

  SocketService.on('cart_data_res', function(x) {
    console.log("Cart Data Res " ,x);
    if(x.token) {
      localStorage.setItem(USGS_KEY_NAME,x.token);
      localStorage.setItem(USGS_KEY_TIME,new Date().getTime());
      existing_key = x.token;
    }    
    // var map = {};
    // x.data.map(function(x) {
    //   map[x.entityId] = x;
    // });
    $scope.isShoppingCartLoading = false;
    $scope.cartRes = x.data;
  });
  
  $scope.showImage = function(ev){
    $(ev.target).ekkoLightbox();
  };
  SocketService.on('cart_nodata',function(data){
    if(data.token) {
      localStorage.setItem(USGS_KEY_NAME,data.token);
      localStorage.setItem(USGS_KEY_TIME,new Date().getTime());
      existing_key = data.token;
    }
    if (data.size == 0) 
      $scope.usgsShoppingNoData = true;
    // Bunch of ids with no data 
    var arr = data.data;
    var res = $scope.cartRes;
    $scope.isShoppingCartLoading = false;
    arr.map(function(x) {
      var obj = res[x];
      if (obj)
        obj.isExnode = false;
    });
  });
  
  SocketService.on('cart_data',function(data){
    if(data.token) {
      localStorage.setItem(USGS_KEY_NAME,data.token);
      localStorage.setItem(USGS_KEY_TIME,new Date().getTime());
    }
    var map = data.data ;
    var res2 = $scope.cartRes;
    for (var k in res2) {
      var res = res2[k];
      res.forEach(function(x) {
	if (map[x.entityId]) {
	  x.isExnode = true;
	  x.exFileArr = x.exFileArr || [];	  
	  x.exFileArr.push.apply(x.exFileArr,map[x.entityId]);
	  x.exMap = x.exMap || {} ;
	}
      });
    }
    return;
    // for ( var i in map) {
    //   var exArr = map[i];
    //   for (var j = 0; j < exArr.length ; j++){        
    //     var it = exArr[j];
    //     var obj = res[i];
    //     if (obj) {
    //       obj.isExnode = true;
    //       var arr = obj.exFileArr = obj.exFileArr || [];
    //       obj.exMap = obj.exMap || {} ;
    //       if (!obj.exMap[it.name]) {
    //         arr.push(it);
    //         obj.exMap[it.name] = true;  
    //       }
    //       obj._exnodeData = it;          
    //     }      
    //   };
    // }
  });
  SocketService.on('cart_error',function(err) {
    $scope.isShoppingCartLoading = false;
    if (err.errorMsg) {
      $scope.cartErrorMsg = err.error;
      if (/password/i.test(err.error))
        $scope.showLogin();
    } else {
      // Print out as System error and log it in the console
      $scope.cartErrorMsg = "Unknown error - This is probably an issue with the EarthExplorer ";
    }
  });
}
