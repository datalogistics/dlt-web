/*
 * Depot Module Definition
 * public/js/depot
 * DepotModule.js
 */

angular.module('depot', [])
  .factory('DepotService', ['$http', function($http) {
    return new depotService($http);
  }])
  .controller('DepotController', depotController);
