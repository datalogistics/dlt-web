/*
 * Depot Module Definition
 * public/js/depot
 * DepotModule.js
 */

angular.module('depot', [])
  .factory('DepotService', ['$http', 'UnisService', 'CommChannel', function($http, UnisService, CommChannel) {
    return new depotService($http, UnisService, CommChannel);
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
  .controller('DepotController', depotController)
  .controller('DepotNewWinGraphController',depotNewWinGraphController)


