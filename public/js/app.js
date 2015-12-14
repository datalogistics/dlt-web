/*
 * Setup Our Angular App
 * public/js/
 * app.js
 */
// The global config json
var DLT_PROPS = {
  // FreeGeoIpUrl :"http://dlt.incntre.iu.edu:8080/json/"
  FreeGeoIpUrl :"https://www.freegeoip.net/json/"
};
angular.module('periApp', ['ngRoute',
                           'ngCookies',
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
                           'auth',
			   'map'])
  .run(function($rootScope, UnisService, DepotService, CommChannel,$modal,$cookies,$http) {
    $rootScope.unis = UnisService;
    $rootScope.depot = DepotService;
    $rootScope.loggedIn = false;

    var ud = $cookies.userDetails;
    if (ud) {
      $rootScope.loggedIn = true;
      $rootScope.userData = {
        email : ud
      };
    }
    $rootScope.userLogout = function() {
      $http.post("/logout")
        .then(function() {
          $rootScope.loggedIn = false;
          $rootScope.userData = {};
        });
    }
    $rootScope.comm = CommChannel;
    $rootScope.openLogin = function() {
      var modalInstance = $modal.open({
        templateUrl: 'loginModal.ejs',
        controller: 'LoginModalCtrl',
        // size: size,
        resolve: {          
        }
      });

      modalInstance.result.then(function (selectedItem) {
        $scope.selected = selectedItem;
      }, function () {
        // $log.info('Modal dismissed at: ' + new Date());
      });
    }
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
                 templateUrl: 'views/download_map.html',
                 controller: 'DownloadMapController',
                 resolve: {
                   'unis': function(UnisService) {
                     return UnisService.init()
                   }}
               }).
               when('/downloads/filter',{
                 templateUrl: 'views/download_map.html',
                 controller: 'DownloadMapController',
                 resolve: {
                   'unis': function(UnisService) {
                     return UnisService.init()
                   }}
               })
               .when('/exnode/:id', {
                 templateUrl: 'views/exnode_map.html',
                 controller: 'ExnodeMapController',
                 resolve: {
                   'unis': function(UnisService) {
                     return UnisService.init()
                   }}
               })
               .otherwise({redirectTo: '/'});

             $locationProvider.html5Mode(true);
           }]);
