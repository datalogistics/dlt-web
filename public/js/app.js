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
			   'routes',
			   'main',
			   'unis',
			   'exnode',
			   'depot',
			   'map'])
  .run(function($rootScope, UnisService) {
    $rootScope.unis = UnisService;
  });
