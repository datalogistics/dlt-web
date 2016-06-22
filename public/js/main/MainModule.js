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
 * Main Page Module
 * public/js/main/
 * MainModule.js
 */

angular.module('main', ['avDirective'])
  .factory('mainService', ['$http', function($http) {
    return new MainService($http);
  }])
  .controller('mainController', ['$scope'], MainController);
