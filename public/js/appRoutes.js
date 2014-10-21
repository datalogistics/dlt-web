/*
 * Routes and Views to Render
 * public/js/
 * appRoutes.js
 */

angular.module('appRoutes', []).config(['$routeProvider', '$locationProvider', 'cfpLoadingBarProvider', function($routeProvider, $locationProvider, cfpLoadingBarProvider) {

  cfpLoadingBarProvider.includeSpinner = false;

  $routeProvider.
    when('/', {
      templateUrl: 'views/slice.html',
      controller: 'SliceController'
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
        templateUrl: 'views/eodn.html',
        controller: 'EodnController'
    }).
    when('/eodnMap/', {
        templateUrl: 'views/eodn.html',
        controller: 'EodnController'
    }).
    when('/eodn/', {
        templateUrl: 'views/eodn.html',
        controller: 'EodnController'
    }).
    when('/eodn/:id', {
        templateUrl: 'views/eodn.html',
        controller: 'EodnController'
    }).
    otherwise({redirectTo: '/'});

  $locationProvider.html5Mode(true);

}]);
