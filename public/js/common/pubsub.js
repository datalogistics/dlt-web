angular.module('pubsub', [])
// Uses the rootScope to broadcast and deliver tagged messages
  .factory('CommChannel', ['$rootScope', function ($rootScope) {
    // broadcast the notifications
    var newData = function (tag, item) {
      $rootScope.$broadcast(tag, {item: item});
    };
    // subscribe to notifications
    var onNewData = function(tag, handler) {
      $rootScope.$on(tag, function(event, args) {
        handler(args.item);
      });
    };
    // return the publicly accessible methods
    return {
      newData: newData,
      onNewData: onNewData
    };
  }])
