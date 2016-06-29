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

  //To support disconnecting listeners before the socket disconnects
  //http://stackoverflow.com/questions/21008087/what-to-use-instead-of-socket-removealllisteners-on-the-client-side
  service.getSocket = function() {return socket;}

  return service;
}
