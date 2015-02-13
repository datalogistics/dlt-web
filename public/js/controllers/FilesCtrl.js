/*
 * Files Page Controller
 * public/js/controllers/
 */

function getProperties(obj) {
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

angular.module('FilesCtrl', []).controller('FilesController', function($scope, $routeParams, $location, $rootScope, Depot, Socket,Exnode) {
    // Inlining the schema - Testing
    $scope.exFields = getProperties(window.exnodeScheme);
    $scope.selectedExnode = false;
    $scope.setField = (function(x){
        $scope.selectedExnode = x;        
    });

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
        Exnode.search(params, function(res){
            $scope.isSearched = true;
            console.log(res);
            $scope.searchRes = res;
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
    $scope.nodeSelected = function(a,b){
        var info = b.node.original;
        console.log(info);
        $scope.fileViewer = "Id : " + info.id  + "\n" + 
            "Created: " + info.created + "\n" +
            "Modified: " + info.modified + "\n" +
            (info.size ? "Size : " + info.created + "\n" : "") ;
        $scope.showDownload = info.isFile;
        $scope.downloadId = info.id ;
    };
    $scope.downloadFile = function(){
        //Download this file         
        console.log("Downloading this file ",$scope.downloadId);
    };
});

