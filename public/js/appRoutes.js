/*
 * Routes and Views to Render
 * public/js/
 * appRoutes.js
 */

angular.module('appRoutes', []).config(['$routeProvider', '$locationProvider', 'cfpLoadingBarProvider',
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
    when('/eodnMap/:depotId', {
        templateUrl: 'views/depot_map.html',
        controller: 'DepotMapController'
    }).
    when('/eodnMap/', {
        templateUrl: 'views/depot_map.html',
        controller: 'DepotMapController'
    }).
    when('/eodn/', {
        templateUrl: 'views/depot_map.html',
        controller: 'DepotMapController'
    }).
    when('/eodn/:id', {
        templateUrl: 'views/depot_map.html',
        controller: 'DepotMapController'
    }).
    when('/files/',{    	
    	templateUrl: 'views/files.html',
    	controller: 'FilesController'
    }).
    otherwise({redirectTo: '/'});

  $locationProvider.html5Mode(true);

}]);
