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
    $http.get('/api/fileTree'+q).success(function(data) {
      cb(data);
    });
  };
    
  service.searchUsgsRow = function (params) {
    var paramStr = $.param(params);
    return $http.get('/api/usgsrowsearch?'+paramStr);
  };

  service.searchUsgsLat = function (params) {
    var paramStr = $.param(params);
    return $http.get('/api/usgslatsearch?'+paramStr);
  };
  
  return service;
}
