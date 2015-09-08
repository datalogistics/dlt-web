function loginModal($scope,$modalInstance,$rootScope,$q) {

  $scope.isLogin = true;
  $scope.showLogin = function() {  $scope.isLogin = true; };
  $scope.showRegister = function() { $scope.isLogin = false; };
  $scope.formLoading = false;
  // $scope.loginForm = {};
  $scope.login = function() {
    var uname = $("input[name=loginFormEmail]").val();
    var pwd = $("input[name=loginFormPwd]").val();
    $scope.formLoading = true;
    (function () {
      $scope.formLoading = false;      
      $modalInstance.close();
      $rootScope.loggedIn = true;
      $rootScope.userData = {
        email : uname
      };
    })();
  }

  $scope.register = function() {
    var uname = $("input[name=regFormEmail]").val();
    var pwd = $("input[name=regFormPwd]").val();
    var name = $("input[name=regFormName]").val();
    $scope.formLoading = true;
    (function() {
      $scope.formLoading = false;
      $scope.showLogin();
    })();
  }
  
  $scope.closeDialog = function() {
    $modalInstance.dismiss('cancel');
  }
}


