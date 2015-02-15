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