/*
 * Depot Module Definition
 * public/js/depot
 * DepotModule.js
 */

angular.module('depot', [])
  .factory('DepotService', ['$http', 'UnisService', 'CommChannel', function($http, UnisService, CommChannel) {
    return new depotService($http, UnisService, CommChannel);
  }])
  .controller('DepotController', depotController)
  .controller('DepotNewWinGraphController',depotNewWinGraphController)


