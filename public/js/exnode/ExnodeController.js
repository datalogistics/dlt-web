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
function exnodeController($scope, $routeParams, $location, $http, ExnodeService,$log,SocketService,ivhTreeviewMgr) {
  // Dangerous code
  // SocketService.emit('exnode_getAllChildren', {id : null});
  // SocketService.on('exnode_childFiles' , function(d){
  //   console.log("***********************",d);
  // });
  // The Exnode file browser
  //

  $scope.fieldArr = [];
  $scope.files = [];
  $scope.exnodePolicySelector = [];
  $scope.selectedIds = [];
  $scope.treeSearch = [];

  // tree setup
  $scope.treetpl = [
    '<div id="{{node.id}}" style="min-height:25px;">',
    '- <span ng-if="trvw.useCheckboxes()" ivh-treeview-checkbox style="display:none;">',
      '</span>',
      '<span ivh-treeview-toggle>',
        '<span ivh-treeview-twistie ng-if="node.isFile && !node.selected" class="file-inactive" ng-click="trvw.toggleSelected(node)"></span>',
        '<span ivh-treeview-twistie ng-if="node.isFile && node.selected" class="active-file" ng-click="trvw.toggleSelected(node)"></span>',
        '<span ivh-treeview-twistie ng-if="!node.isFile && !node.selected"></span>',
        '<span ivh-treeview-twistie ng-if="!node.isFile && node.selected" class="active-folder"></span>',
      '</span>',
      '<span class="ivh-treeview-node-label" ng-click="trvw.toggleSelected(node)" title="{{node.text}}">',
       '{{trvw.label(node)}}',
      '</span>',
      '<div ivh-treeview-children style="margin-top:5px"></div>',
    '</div>'
  ].join('\n');

  // ur gonna want to console.log this part.
  $scope.getNode = function(node, selected, tree){
    if(node.isFile == false){
      // if folder, search through it and do the deed
      ivhTreeviewMgr.expand(tree, node);
      node.checked = false;
      selectChildren(node, selected);
    } else { // just a file
      node.checked = false;
      selected ? $scope.selectedIds.push(node) : removeById($scope.selectedIds, node);
    }
    ivhTreeviewMgr.validate(tree);
  };

  var selectChildren = function(node, selected){
    node.children.forEach(function(child){
        if(child.isFile == false){
          selectChildren(child);
        } else {
          selected == false ? removeById($scope.selectedIds, child) : $scope.selectedIds.push(child);
        }
    });
  };

  // end tree setup

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
      $scope.selectedIds = [];
      $scope.isSearched = true;
      buildTree(res);
      $scope.searchRes = res;
      $scope.exSearchResAsArr = res.map(function(x) {
        x.parent = "#";
        x.children = false;
        return x ;
      });
      $scope.isExLoading = false ;
      console.log("RES", res);
      console.log("TREE S: ", $scope.tree);

    });
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

  $scope.invalidateLoaded = function(a,b){
    var info = b.node.original;
    var jstr = jQuery.jstree.reference(this);
    jstr.save_state()
    if (!info.isFile) {
      jstr.get_node(info.id).state.loaded = false;
    }
  }

  $scope.saveTreeState = function(a,b) {
    var jstr = jQuery.jstree.reference(this);
    jstr.save_state()

  }

  function selectNodeGen(prefix) {
    return function(a,b){
      var info = b.node.original;
      var selectedIds = $scope[prefix + 'selectedIds'] = $scope[prefix + 'selectedIds'] || {} ;
      var jstr = jQuery.jstree.reference(this);
      jstr.save_state()
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

    // Gross, I know, I should spend the time to clean this up into a map / filter operation later.
    // This block filters files from api/fileTree down to most recent and preserves directory duplicates.
     $http.get('/api/fileTree')
      .then(function(res) {
        buildTree(res.data);
      });

  // underscore.js is for noobs
  function removeById(arr, item) {
    for(var i = arr.length; i--;) {
        if(arr[i].id === item.id && arr[i].isFile == true) {
            arr.splice(i, 1);
        }
      }
    }

  // GIGANTIC REMINDER TO SELF THAT THIS WILL NEED TO CHANGE WHEN API RETURNS AN ARRAY OF OBJECTS
  // RATHER THAN AN OBJECT OR OBJECTS AND WHEN PROPERTIES NO LONGER TRY TO RESOLVE AS MATH.
  $http.get('/api/wildfire')
    .then(function(res) {
       var result = [];
       console.log("DATA: ", res.data[0]);
       for(var prop in res.data[0]){
         var obj = {};
         obj.label = prop;
         obj.selected = false;
         obj.ferry_name = prop;
         $scope.exnodePolicySelector.push(obj);
       }
      console.log('RESULT:', $scope.exnodePolicySelector);

  });

  var buildTree = function(data){

             // init all files into the scope to hold them for a second
            $scope.files = data;

            // filter through everything, remove dupes, preserve directory hierarchy
            for(o in data){
              var obj = data[o];
              console.log(obj);
              for(t in data){
                test = data[t];
                if(obj.text == test.text && obj.parent == test.parent){
                  if(obj.created > test.created){
                    removeById($scope.files,test);
                  } else {
                    removeById($scope.files,obj);
                  }
                }
                if(test.parent != '#'){
                  var p = test.parent;
                  // this is the critical line of code, wierd right...
                  $scope.files[t].parent = test.parent;
                  console.log("SCOPE WHY? D:", $scope.files[t]);
                }
              }
            }

            construct_tree();

            console.log("GUTS ", $scope.tree);
            console.log("FILES", $scope.files);

  }

  var construct_tree = function(){

    console.log("FILES: ", $scope.files)
    var temp_struct = $scope.files;
    temp_struct.forEach(function(obj){obj.under = obj.parent});

    $scope.tree = [];

    // if only a singular result returns, handle it right away.
    if($scope.files.length == 1){
      node = $scope.files[0];
      node.label = $scope.files[0].text;
      if(node.label.length > 14){
        node.label = node.label.substring(0,14) + '...';;
      }
      $scope.tree.push(node);
    }

    // push files into the tree yo
    for(i in $scope.files){
      file = $scope.files[i];
      console.log("LE FILE: ", file);
      var node = file;
      if(file.children){
        node.label = file.text;
        node.children = [];
        for(f in $scope.files){
          test = $scope.files[f];

          if( file.id == $scope.files[f].parent && test.isFile == true){
            var childNode = test;
            if(test.text.length > 10){
              // Cut the label length so it fits correctly on most resolutions.
              childNode.label = test.text.substring(0,10) + '...';
            }
            node.children.push(childNode);
          }
        }
        if(node.label.length > 14){
          node.label = node.label.substring(0,14) + '...';;
        }
        $scope.tree.push(node);
      } else {
        if(file.parent == '#'){
          node.label = file.text;
          if(node.label.length > 14){
            node.label = node.label.substring(0,14) + '...';
          }
          $scope.tree.push(node);
        }
      }
    }

  };



  function unselectNodeGen(prefix){
    return function(a,b){
      var jstr = jQuery.jstree.reference(this);
      jstr.save_state()
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

  $scope.policySelect = function(policy){

    var htmlID = policy.label;
    policy.selected = !policy.selected;
    console.log(policy);
    $('.' + htmlID.toString()).parent().toggleClass('policy-select');
    console.log('toggled');
  };

  $scope.clearSelected = function(){
    $scope.selectedIds = [];
    $scope.exnodePolicySelector.forEach(function(p){p.selected = false});
    $('.policy-option').parent().removeClass('policy-select');
    ivhTreeviewMgr.deselectAll($scope.tree);
  }

  $scope.applyPolicies = function(){
    // Gathers selected policies and exnodes to be POSTED
    var policies = $scope.exnodePolicySelector;
    var selectedPolicies = policies.filter(function(p){if(p.selected){return p}  });
    console.log("SELECTED POLICIES: ", selectedPolicies);
    var exNodes = $scope.selectedIds.filter(function(e){if(e.checked){return e}  });
    console.log("SELECTED EXNODES: ", exNodes);

    data = {policies: selectedPolicies,
            nodes: exNodes};
    console.log(JSON.stringify(data));
    // POST TO URL HERE;
  };

  $scope.selectAllPolicy = function(){
    $('.policyElement').removeClass('policy-select');
    $('.policyElement').addClass('policy-select');
  };

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

  $scope.showExnodeMap = function(id) {

    var parts = id.split("/")
    id = parts[parts.length-1]
    console.log("Showing exnode map for ", id)
    $location.path("/exnode/"+id, true)
  }
}
