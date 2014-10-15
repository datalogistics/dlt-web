/*
 * Routes and Views to Render
 * public/js/
 * appRoutes.js
 */

angular.module('appRoutes', []).config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {

  $routeProvider.
    when('/', {
      templateUrl: 'views/slice.html',
      controller: 'SliceController'
    }).
    when('/depots', {
      templateUrl: 'views/depots.html',
      controller: 'DepotController'
    }).
    when('/depots/:id', {
      templateUrl: 'views/depot_data.html',
      controller: 'DepotController'
    }).
    when('/eodn', {
        templateUrl: 'views/eodn.html',
        controller: 'EodnController'
    }).
    otherwise({redirectTo: '/'});

  $locationProvider.html5Mode(true);

}]);
