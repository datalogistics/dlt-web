// =============================================================================
//  Data Logistics Toolkit (dlt-web)
//
//  Copyright (c) 2015-2016, Trustees of Indiana University,
//  All rights reserved.
//
//  This software may be modified and distributed under the terms of the BSD
//  license.  See the COPYING file for details.
//
//  This software was created at the Indiana University Center for Research in
//  Extreme Scale Technologies (CREST).
// =============================================================================
/*
 * Map Module Definition
 * public/js/map
 * MapModule.js
 */

angular.module('map', [])
  .controller('MapController', mapController)
  .controller("DownloadMapController", downloadMapController)
  .controller("ExnodeMapController", exnodeMapController);
