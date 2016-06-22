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


