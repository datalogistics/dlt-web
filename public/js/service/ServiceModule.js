/*
 * Service Module Definition
 * public/js/service
 * ServiceModule.js
 */

angular.module('service', [])
  .factory('ServiceService', ['$http', 'UnisService', 'CommChannel', function($http, UnisService, CommChannel) {
    return new serviceService($http, UnisService, CommChannel);
  }])
  .filter('serviceOnCount', function () {
    return function (input, property) {
      var i = input instanceof Array ? input.length : 0;
      if (typeof property === 'undefined' || i === 0) {
        return i;
      } else {
        var total = 0;
        while (i--)
          total += input[i][property] === "ON" ? 1 : 0;
        return total;
      }
      return total;
    };
  })
  .controller('ServiceController', serviceController)
  .controller('ServiceNewWinGraphController', serviceNewWinGraphController)


