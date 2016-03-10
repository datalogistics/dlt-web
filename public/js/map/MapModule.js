/*
 * Map Module Definition
 * public/js/map
 * MapModule.js
 */

angular.module('map', [])
  .controller('MapController', mapController)
  .controller("DownloadMapController", downloadMapController)
  .controller("ExnodeMapController", exnodeMapController)
  .controller("MeasurementTopologyController", measurementTopologyController)
  .controller("TopologyMapController", topologyMapController)
  .controller("ExnodeMapController", exnodeMapController)
