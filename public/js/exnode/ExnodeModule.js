/*
 * Exnode Module Definition
 * public/js/exnode
 * ExnodeModule.js
 */

angular.module('exnode', [])
  .factory('ExnodeService', ['$http', function($http) {
    return new exnodeService($http);
  }])
  .controller('ExnodeController', exnodeController)
  .controller('DltFormController', dltFormController)
  .controller('ShoppingCartController', shoppingCartController)
