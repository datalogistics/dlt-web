function getSchemaProperties(obj) {
    var n = obj.properties;
    var arr = [];
    for (i in n) {
        i = i || "";
        if (i.charAt(0) != "$") {
            arr.push({
                name : i,
                desc : n[i].description
            });
        };
    };
    return arr;
};
/*
 * Exnode Browser Page Controller
 * public/js/exnode/
 * ExnodeController.js
 */
function exnodeController($scope, $routeParams, $location, $rootScope, ExnodeService,$log,SocketService) {
  // Dangerous code
  // SocketService.emit('exnode_getAllChildren', {id : null});
  // SocketService.on('exnode_childFiles' , function(d){
  //   console.log("***********************",d);
  // });
  // The Exnode file browser 
  $scope.fieldArr = [];      
  $scope.addField = function(){
    var x = {
      id : $scope.fieldArr.length,
      value : ""
    };
    $scope.fieldArr.push(x);        
  };
  $scope.addField();
  $scope.removeField = function(ind){
    var arr = $scope.fieldArr;
    var index ; 
    for ( var i =0 ;i < arr.length ; i++) {
      if (arr[i].id == ind)
        break;
    };

    // Delete        
    arr.splice(i,1);
    console.log("New Arr",arr , i , ind);
  };

  $scope.isSearched = false ;
  $scope.searchExnodes = function(){
    var sarr = [];
    $("#searchForm select").each(function(x){
      sarr.push($(this).val());
    });        
    var varr = [];
    $("#searchForm [name=searchValue]").each(function(x){
      varr.push($(this).val());
    });
    // Now create a query with this
    var params = {};
    sarr.map(function (name , i) {
      params[name] = varr[i];
    });
    ExnodeService.search(params, function(res){
      $scope.isSearched = true;
      console.log(res);
      $scope.searchRes = res;
      $scope.exSearchResAsArr = res.map(function(x) {
        x.parent = "#";
        x.children = false;
        return x ;
      });
    });;
  };
  
  $scope.schema = window.exnodeScheme;
  
  $scope.form = window.exnodeForm;
  
  $scope.model = {};
  $scope.showInfo= function(){
  };
  $scope.fileInfo = "Select a file";
  $scope.fileViewer = 'Please select a file to view its contents';
  $scope.showDownload = false;

  // Angular will use the selected Ids to display information 
  // The generator func
  function selectNodeGen(prefix) {
    return function(a,b){
      var info = b.node.original;
      var selectedIds = $scope[prefix + 'selectedIds'] = $scope[prefix + 'selectedIds'] || {} ;
      selectedIds[info.id] = info;
      // console.log(info);    
      $scope[prefix+'showDownload'] = info.isFile;
      $scope[prefix+'downloadId'] = info.id ;     
    };
  };
  k = $scope ;
  function unselectNodeGen(prefix){
    return function(a,b){
      var info = b.node.original;
      delete ($scope[prefix+'selectedIds'] || {})[info.id];
    };
  };
  
  $scope.nodeSelected = selectNodeGen("");
  $scope.nodeUnselected = unselectNodeGen("");

  $scope.exsearchNodeSelected = selectNodeGen("exsearch");
  $scope.exsearchNodeUnselected = unselectNodeGen("exsearch");

  $scope.usgsNodeSelected = selectNodeGen("usgs");
  $scope.usgsNodeUnselected = unselectNodeGen("usgs");

  $scope.uncheckAll = function() {
    $scope.selectedIds = {};
  };
  $scope.checkAll = function (a,b) {
    console.log(arguments);
  }

  $scope.downloadOne = function(id){
    console.log("Downloading this file ",id);
    client_action([id], 'download');
  };
  $scope.downloadAll = function(){
    var arr = [];
    $(".exnodeFileList input:checked").each(function(){
      arr.push($(this).val());
    });
    client_action(arr, 'download');
  };
  
  function client_action(arr, app) {
    var csv = (arr || []).join(",");
    var k = "<form action='/api/download' method='post'>"
    k += "<input type='text' name='refList' value='"+csv+"'/>"
    k += "<input type='text' name='app' value='"+app+"'/>"
    k += "</form>";
    $(k).submit();
  };
}

