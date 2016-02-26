/*
 * Map Module Definition
 * public/js/map
 * MapModule.js
 */

angular.module('map', [])
  .controller('MapController', mapController)
  .controller("DownloadMapController", downloadMapController)
  .controller("ProbeMapController", probeMapController)
  .controller("TopologyMapController", topologyMapController)
  .controller("ExnodeMapController", exnodeMapController);
