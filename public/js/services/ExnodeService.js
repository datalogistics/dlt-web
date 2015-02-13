/*
 * Rest Services for Depot
 * public/js/services/
 * DepotService.js
 */

angular.module('ExnodeService', []).service('Exnode', function($http, Socket) {
    this.search = function(params , cb){
        var q = "?mode=file&";
        for (var i in params) {
            var val = params[i];
            q += i + "=reg="+val+"&";
        };
        $http.get('/api/exnodes'+q).success(function(data) {
            cb(data);
        });
    };
});
