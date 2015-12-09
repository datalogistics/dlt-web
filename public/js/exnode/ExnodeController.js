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
  $scope.addCustomField = function(){
    var x = {
      id : $scope.fieldArr.length,
      value : "",
      isCustom : true
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
    $("#searchForm input.custom").each(function(x){
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
    $scope.isExLoading = true;
    ExnodeService.search(params, function(res){
      $scope.isSearched = true;
      console.log(res);
      $scope.searchRes = res;
      $scope.exSearchResAsArr = res.map(function(x) {
        x.parent = "#";
        x.children = false;
        return x ;
      });
      $scope.isExLoading = false ;
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
  // A map of parentNode to obj with parentId and array of child
  var parentMap = {};
  function childFileHandler(data){
    console.log("Getting child data" , data.emitId , data.arr);
    var arr = data.arr;
    // Just for the tree in enxode Browser 
    var prefix = "";
    var selectedIds = $scope[prefix + 'selectedIds'] = $scope[prefix + 'selectedIds'] || {} ;
    var emitP = parentMap[data.emitId+""] = parentMap[data.emitID+""] || {};
    emitP.child = emitP.child  || []; 
    for (var i=0;i < arr.length; i++){
      var info = arr[i];
      selectedIds[info.id] = info;
      // console.log(info);    
      $scope[prefix+'showDownload'] = info.isFile;
      $scope[prefix+'downloadId'] = info.id ;
      // Process parent and add and remove to parentMap as required
      var p = parentMap[info.parent+""] = parentMap[info.parent+""] || {};
      p.child = p.child || [];
      p.child.push(info);
      emitP.child.push(info);
    };
    // Now store parent info so that selection in future may not need requests    
  };
  
  SocketService.on('exnode_childFiles', childFileHandler);

  $scope.clearState = function(a,b){
    var info = b.node.original;
    if (!info.isFile) {
      var jstr = jQuery.jstree.reference(this);
      jstr.get_node(info.id).state.loaded = false;
    }
  }
  function selectNodeGen(prefix) {
    return function(a,b){
      var info = b.node.original;
      var selectedIds = $scope[prefix + 'selectedIds'] = $scope[prefix + 'selectedIds'] || {} ;
      if (!info.isFile) {
        // Do nothing
        return;
        // Lets get all the child files and add it
        // Also create a map to store info and use to remove
        // If it exists in map , use that        
        var par = parentMap[info.id];
        if (par) {
          childFileHandler({emitId : info.id , arr : par.child});
        } else {
          SocketService.emit('exnode_getAllChildren',{id : info.id});       
        };
      } else {
        selectedIds[info.id] = info;
        // console.log(info);    
        $scope[prefix+'showDownload'] = info.isFile;
        $scope[prefix+'downloadId'] = info.id ;     
      }
    };
  };
  
  function unselectNodeGen(prefix){
    return function(a,b){
      var info = b.node.original;
      if(!info.isFile) {
        // Do Nothing
        return;
        // Now let us remove the files we added
        var p = parentMap[info.id];
        if (p && p.child) {
          for (var i =0 ; i<p.child.length ; i++) {
            var it = p.child[i];
            // Now remove these ids
            delete ($scope[prefix+'selectedIds'] || {})[it.id];
          }
        }
      } else 
        delete ($scope[prefix+'selectedIds'] || {})[info.id];
    };
  };
  
  $scope.nodeSelected = selectNodeGen("");
  $scope.nodeUnselected = unselectNodeGen("");

  $scope.exsearchNodeSelected = selectNodeGen("exsearch");
  $scope.exsearchNodeUnselected = unselectNodeGen("exsearch");

  $scope.usgsNodeSelected = selectNodeGen("usgs");
  $scope.usgsNodeUnselected = unselectNodeGen("usgs");

  $scope.selectToggle = function() {
    var flag = true; 
    $(".exnodeFileList tbody input").each(function(x) {
      flag = flag && $(this).prop("checked");
      // Break if flag true
      return flag;
    });    
    if (!flag) {
      $(".exnodeFileList input").prop("checked",true);
    } else {
      $(".exnodeFileList input").prop("checked",false);
    }
  };


  $scope.downloadOne = function(id){
    console.log("Downloading this file ",id);
    client_action([id], 'download');
  };

  $scope.showExnodeMap = function(id) {
    var parts = id.split("/")
    id = parts[parts.length-1]
    console.log("Showing exnode map for ", id)
    $location.path("/exnode/"+id)
  }

  $scope.downloadAll = function(){
    var arr = [];
    $(".exnodeFileList input:checked").each(function(){
      arr.push($(this).val());
    });
    client_action(arr, 'download');
  };

  $scope.downloadSelectedImage = function(arr) {
    client_action(arr,'download');
  };

  $scope.downloadAllUsgsEx = function(arr) {
    client_action(arr.map(function(x) { return x.url || x.selfRef;}),'download');
  };
  function client_action(arr, app) {    
    var csv = (arr || []).join(",");
    var k = "<form action='/api/download' method='post'>"
    k += "<input type='text' name='refList' value='"+csv+"'/>"
    k += "<input type='text' name='app' value='"+app+"'/>"
    k += "</form>";
    var dom = $(k);
    $(document.body).append(dom);
    dom.hide();
    dom.submit();
  };
}

