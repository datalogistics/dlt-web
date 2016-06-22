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
 * Unis Module Definition
 * public/js/unis
 * UnisModule.js
 */

angular.module('unis', [])
  .factory('SocketService', ['$rootScope', '$http', function($rootScope, $http) {
    return new socketService($rootScope, $http);
  }])
  .factory('UnisService', ['$q', '$http', '$timeout', 'SocketService', 'CommChannel', function($q, $http, $timeout, SocketService, CommChannel) {
    return new unisService($q, $http, $timeout, SocketService, CommChannel);
  }]);
  
