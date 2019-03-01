/*
 * Map Module Definition
 * public/js/map
 * MapModule.js
 */

angular.module('map', [])
  .factory('EsmondService', ['$http', '$polling',  function($http, $polling) {
    return new esmondService($http, $polling);
  }])
  .factory('TopologyService', ['$http', '$q','UnisService',  function($http, $q) {
    return new topologyService($http, $q);
  }])
  .controller('MapController', mapController)
  .controller("DownloadMapController", downloadMapController)
  .controller("ExnodeMapController", exnodeMapController)
  .controller("TopologyMapController", topologyMapController)
  .controller("Topology2MapController", topology2MapController)
  .controller("ExnodeMapController", exnodeMapController)
  .directive("topologyMap", topoMapDirective)
  .directive('highlighter', ['$timeout', function($timeout) {
    return new highlighterDirective($timeout);
  }]);
