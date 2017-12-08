/*
 * Map Module Definition
 * public/js/map
 * MapModule.js
 */

angular.module('map', [])
  .factory('EsmondService', ['$http', function($http) {
    return new esmondService($http);
  }])
  .controller('MapController', mapController)
  .controller("DownloadMapController", downloadMapController)
  .controller("ExnodeMapController", exnodeMapController)
  .controller("TopologyMapController", topologyMapController)
  .controller("ExnodeMapController", exnodeMapController)
  .directive("topologyMap", topoMapDirective)
