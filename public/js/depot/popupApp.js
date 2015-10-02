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
