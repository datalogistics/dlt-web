/*
 * Depot Module Definition
 * public/js/depot
 * DepotModule.js
 */

angular.module('depot', [])
  .factory('DepotService', ['$http', 'UnisService', function($http, UnisService) {
    return new depotService($http, UnisService);
  }])
  .controller('DepotController', depotController);
