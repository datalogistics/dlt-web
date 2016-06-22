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
 * Setup Our Angular App
 * public/js/
 * app.js
 */

angular.module('periApp', ['ngRoute',
			   'jsTree.directive',
			   'angular-loading-bar',
			   'ngAnimate',
			   'ui.utils', 
                           'ui.bootstrap',
                           'ui.bootstrap-slider',
                           'nvd3ChartDirectives',
			   'pubsub',
			   'main',
                           'unis',
			   'exnode',
			   'depot',
			   'map'])  
  .config(['$routeProvider', '$locationProvider', 'cfpLoadingBarProvider',
           function($routeProvider, $locationProvider, cfpLoadingBarProvider) {
             $routeProvider
               .when('/popup/:type', {
                 templateUrl: 'views/depot_data.html',
                 controller: 'DepotNewWinGraphController'
               }).when('/popup/:type/:name', {
                 templateUrl: 'views/depot_data.html',
                 controller: 'DepotNewWinGraphController'
               }).otherwise({redirectTo: '/popup/1/1'});
        $locationProvider.html5Mode(true);
    }]);
