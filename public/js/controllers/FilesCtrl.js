/*
 * Files Page Controller
 * public/js/controllers/
 */
angular.module('FilesCtrl', []).controller('FilesController', function($scope, $routeParams, $location, $rootScope, Depot, Socket) {
    $scope.fileViewer = 'Please select a file to view its contents';
    $scope.treeModel = [{
        "id": "ajson1",
        "parent": "#",
        "text": "Simple root dddnode"
    }, {
        "id": "ajson2",
        "parent": "#",
        "text": "Root node 2"
    }, {
        "id": "ajson4",
        "parent": "ajson2",
        "text": "Child 2"
    }];
    $scope.openNodeCB = function(){
        $scope.$apply(function(){
            $scope.treeModel[1].state = {opened : true };
            $scope.treeModel[0].text = "Hail Angular";
            $scope.treeModel.push({
                "id": "ajson3",
                "parent": "ajson2",
                "text": "Child 1"
            });
            $scope.treeModel.push({
                "id": "ajson14",
                "parent": "ajson2",
                "text": "Chil111111111d 2"
            });
        });
    };
    
    $scope.nodeSelected = function(e, data) {
        var _l = data.node.li_attr;
        if (_l.isLeaf) {
            FetchFileFactory.fetchFile(_l.base).then(function(data) {
                var _d = data.data;
                if (typeof _d == 'object') {

                    //http://stackoverflow.com/a/7220510/1015046//
                    _d = JSON.stringify(_d, undefined, 2);
                }
                $scope.fileViewer = _d;
            });
        } else {

            //http://jimhoskins.com/2012/12/17/angularjs-and-apply.html//
            $scope.$apply(function() {
                $scope.fileViewer = 'Please select a file to view its contents';
            });
        }
    };

});

