// tee hee
(function () {
  'use strict';
  var pollingService = angular.module("services.polling", []);
  pollingService
    .factory('$polling', function ($http) {
        var defaultPollingTime = 10000;
        var polls = [];
        var pollNames = [];
        return {
          startPolling: function (name, url, pollingTime, callback) {
            if(!polls[name]) {
              pollNames.push[name];
              var poller = function () {
                return $http.get(url).then(function (response) {
                    callback(response);
                });
            }
          }
          poller();
          polls[name] = setInterval(poller, pollingTime || defaultPollingTime);
          },
          stopPolling: function (name) {
              clearInterval(polls[name]);
              delete polls[name];
          },
          dumpHistory: function(){
            return pollNames;
          },
          clearAll: function(){
            for(name in polls){
              clearInterval(polls[name]);
              delete polls[name];
            }
          }
        }
    });
}());
