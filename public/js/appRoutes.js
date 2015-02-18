/*
 * Routes and Views to Render
 * public/js/
 * routes.js
 */

angular.module('routes', []).config(['$routeProvider', '$locationProvider', 'cfpLoadingBarProvider',
function($routeProvider, $locationProvider, cfpLoadingBarProvider) {

  cfpLoadingBarProvider.includeSpinner = false;
  
  $routeProvider.
    when('/', {
      templateUrl: 'views/main.html',
      controller: 'MainController'
    }).
    when('/status', {
      templateUrl: 'views/depots.html',
      controller: 'DepotController'
    }).
    when('/depots/:id', {
      templateUrl: 'views/depot_data.html',
      controller: 'DepotController'
    }).
    when('/map/', {
      templateUrl: 'views/depot_map.html',
      controller: 'MapController'
    }).
    when('/map/:id', {
      templateUrl: 'views/depot_map.html',
      controller: 'MapController'
    }).
    when('/browser/',{
      templateUrl: 'views/browser.html',
      controller: 'ExnodeController'
    }).
    when('/downloads/',{
      templateUrl: 'views/downloads.html',
      controller: 'DownloadController'
    }).
    when('/downloads/:id',{
      templateUrl: 'views/download_map.html',
      controller: 'DownloadVizController'
    }).
    otherwise({redirectTo: '/'});
  
  $locationProvider.html5Mode(true);

}]);
