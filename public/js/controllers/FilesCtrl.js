/*
 * Files Page Controller
 * public/js/controllers/
 */
angular.module('FilesCtrl', []).controller('FilesController', function($scope, $routeParams, $location, $rootScope, Depot, Socket) {
    // Inlining the schema - Testing
    $scope.schema ={"$schema":"http://json-schema.org/draft-04/hyper-schema#","id":"http://unis.incntre.iu.edu/schema/exnode/3/exnode#","description":"Schema for describing an base eXnode","name":"eXnode","type":"object","additionalProperties":true,"required":["id","created","modified","name","size","parent","mode"],"properties":{"$schema":{"default":"http://unis.incntre.iu.edu/schema/exnode/3/exnode#","description":"The schema of this file","format":"uri","type":"string"},"id":{"description":"A unique exnode identifier","minLength":1,"type":"string"},"selfRef":{"description":"Self hyperlink reference for the exnode","format":"uri","type":"string"},"mode":{"enum":["file","directory"],"description":"An exnode can represent either a file or a directory"},"created":{"type":"integer","description":"64-bit Integer timestamp of the exnode creation date"},"modified":{"type":"integer","description":"64-bit Integer timestamp of the last modified date"},"urn":{"type":"string","format":"uri"},"name":{"description":"The name of an exnode (EK): probably need a schema for valid names","type":"string"},"size":{"description":"The size of an exnode in bytes","type":"integer"},"description":{"description":"Exnode description","type":"string"},"status":{"description":"Status of an exnode (EK): might be useful, could formalize","type":"string","default":"UNKNOWN"},"parent":{"description":"A pointer to a parent exnode, null if adrift","anyOf":[{"$ref":"http://unis.incntre.iu.edu/schema/exnode/3/exnode#"},{"$ref":"http://json-schema.org/draft-04/links#"},{"type":"null"}]},"properties":{"description":"Additional properties.","type":"object","additionalProperties":true}},"links":[{"rel":"describedby","href":"{$schema}"},{"rel":"self","href":"{id}"},{"rel":"destroy","href":"{id}","method":"DELETE"},{"rel":"create","href":"resources","method":"POST"},{"rel":"update","href":"{id}","method":"PUT"}]};

    $scope.form = [
        "*",
        {
            type: "submit",
            title: "Search"
        }
    ];

    $scope.model = {};

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

