/*
 * Setup Our Angular App
 * public/js/
 * app.js
 */

angular.module('periApp', ['ngRoute',
			   'jsTree.directive',
			   'angular-loading-bar',
			   'angular.filter',
			   'ngAnimate',
			   'ui.scroll',
                           'ui.bootstrap',
                           'nvd3ChartDirectives',
			   'pubsub',
			   'main',
                           'unis',
			   'exnode',
			   'service',
			   'map'])  
  .config(['$routeProvider', '$locationProvider', 'cfpLoadingBarProvider',
           function($routeProvider, $locationProvider, cfpLoadingBarProvider) {
             $routeProvider
               .when('/popup/:type', {
                 templateUrl: 'views/service_data.html',
                 controller: 'ServiceNewWinGraphController'
               }).when('/popup/:type/:name', {
                 templateUrl: 'views/service_data.html',
                 controller: 'ServiceNewWinGraphController'
               }).otherwise({redirectTo: '/popup/1/1'});
        $locationProvider.html5Mode(true);
    }]);
