/*
 * Setup Our Angular App
 * public/js/
 * app.js
 */

angular.module('periApp', ['ngRoute',
			   'jsTree.directive',
			   'angular-loading-bar',
			   'ngAnimate',
			   'schemaForm',
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
  .run(function($rootScope, UnisService, DepotService, CommChannel) {
    $rootScope.unis = UnisService;
    $rootScope.depot = DepotService;
    $rootScope.comm = CommChannel;
  })
  .config(['$routeProvider', '$locationProvider', 'cfpLoadingBarProvider',
      function($routeProvider, $locationProvider, cfpLoadingBarProvider) {
        cfpLoadingBarProvider.includeSpinner = false;
        
        $routeProvider.
    when('/', {
      templateUrl: 'views/main.html',
      controller: 'MainController'
    }).
  when('/status', {
    templateUrl: 'views/depots.html',
    controller: 'DepotController',
    resolve: {
      'unis': function(UnisService) {
        return UnisService.init()
      }}
  }).
  when('/depots/:id', {
    templateUrl: 'views/depot_data.html',
    controller: 'DepotController',
    resolve: {
      'unis': function(UnisService) {
        return UnisService.init()
      }}
  }).
  when('/map/', {
    templateUrl: 'views/depot_map.html',
    controller: 'MapController',
    resolve: {
      'unis': function(UnisService) {
        return UnisService.init()
      }}
  }).
  when('/map/:id', {
    templateUrl: 'views/depot_map.html',
    controller: 'MapController',
    resolve: {
      'unis': function(UnisService) {
        return UnisService.init()
      }}
  }).
  when('/browser/',{
    templateUrl: 'views/browser.html',
    controller: 'ExnodeController'
  }).
  when('/downloads/',{
    templateUrl: 'views/downloads.html',
    controller: 'DownloadController'
  }).
  when('/downloads/map',{
    templateUrl: 'views/download_map.html',
    controller: 'DownloadMapController'
  }).
  otherwise({redirectTo: '/'});

  $locationProvider.html5Mode(true);
    }]);
