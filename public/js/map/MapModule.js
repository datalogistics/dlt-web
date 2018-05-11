/*
 * Map Module Definition
 * public/js/map
 * MapModule.js
 */

angular.module('map', [])
  .factory('EsmondService', ['$http', '$polling',  function($http, $polling) {
    return new esmondService($http, $polling);
  }])
  .controller('MapController', mapController)
  .controller("DownloadMapController", downloadMapController)
  .controller("ExnodeMapController", exnodeMapController)
  .controller("TopologyMapController", topologyMapController)
  .controller("ExnodeMapController", exnodeMapController)
  .controller("GMapController", gMapController)
  .directive("topologyMap", topoMapDirective)
  .directive('highlighter', ['$timeout', function($timeout) {
    return new highlighterDirective($timeout);
  }]);
