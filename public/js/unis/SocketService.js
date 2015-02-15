/*
 * Socket Service
 * public/js/unis/
 * SocketService.js
 */

function socketService($rootScope, $http) {
  
  var service = {};
  var socket = io.connect(window.location.origin);

  service.on = function (eventName, callback) {
    socket.on(eventName, function () {
      var args = arguments;
      $rootScope.$apply(function () {
        callback.apply(socket, args);
      });
    });
  };

  service.emit = function (eventName, data, callback) {
    socket.emit(eventName, data, function () {
      var args = arguments;
      $rootScope.$apply(function () {
        if (callback) {
          callback.apply(socket, args);
        }
      });
    });
  };

  return service;
}