/*
 * Unis Module Definition
 * public/js/unis
 * UnisModule.js
 */

angular.module('unis', [])
  .factory('SocketService', ['$rootScope', '$http', function($rootScope, $http) {
    return new socketService($rootScope, $http);
  }])
  .factory('UnisService', ['$q', '$http', '$timeout', 'SocketService', 'CommChannel', function($q, $http, $timeout, SocketService, CommChannel) {
    return new unisService($q, $http, $timeout, SocketService, CommChannel);
  }]);
  