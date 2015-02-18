/*
 * Rest Services for Exnode
 * public/js/exnode/
 * ExnodeService.js
 */

function exnodeService($http) {
  var service = {}
  
  service.search = function(params , cb){
    var q = "?mode=file&";
    for (var i in params) {
      var val = params[i];
      q += i + "=reg="+val+"&";
    };
    $http.get('/api/exnodes'+q).success(function(data) {
      cb(data);
    });
  };
    
  service.searchUsgsRow = function (params,cb) {
    var paramStr = $.param(params);
    $http.get('/api/usgsrowsearch?'+paramStr).success(function(data){
      cb(data);
    });
  };

  service.searchUsgsLat = function (params,cb) {
    var paramStr = $.param(params);
    $http.get('/api/usgslatsearch?'+paramStr).success(function(data){
      cb(data);
    });
  };
  
  return service;
}
