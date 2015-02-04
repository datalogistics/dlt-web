/*
 * Files Page Controller
 * public/js/controllers/
 */
angular.module('FilesCtrl', []).controller('FilesController', function($scope, $routeParams, $location, $rootScope, Depot, Socket) {
    $scope.fileViewer = 'Please select a file to view its contentsdddddd';
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

