function loginModal($scope,$modalInstance,$rootScope,$q,$http) {
  $scope.isLogin = true;
  function resetState() {
    $scope.isLoginError = false;
    $scope.isSystemError = false;
    $scope.formLoading = false;
  }
  $scope.showLogin = function() { resetState(); $scope.isLogin = true; };
  $scope.showRegister = function() { resetState();$scope.isLogin = false; };
  resetState();
  // $scope.loginForm = {};
  $scope.login = function() {
    var uname = $("input[name=loginFormEmail]").val();
    var pwd = $("input[name=loginFormPwd]").val();
    resetState();
    $scope.formLoading = true;
    $http.post("/login",{ email : uname,password: pwd})
      .then(function (res) {
        var data = res.data;
        if (!data || !data.success)
          return $q.reject(res);
        $scope.formLoading = false;
        $modalInstance.close();
        $rootScope.loggedIn = true;
        $rootScope.userData = {
          email : uname
        };
        return true;
      })
      .catch(function() {
        $scope.formLoading = false;
        $rootScope.loggedIn = false;
        $scope.isLoginError = true;
        // $scope.isSystemError = true;
      });
  };

  $scope.register = function() {
    var uname = $("input[name=regFormEmail]").val();
    var pwd = $("input[name=regFormPwd]").val();
    var cpwd = $("input[name=regFormCPwd]").val();
    var name = $("input[name=regFormName]").val();
    resetState();
    $scope.formLoading = true;
    $http.post("/register",{ name: name , email : uname,password: pwd, cpassword : cpwd})
      .then(function(res) {
        var data = res.data;
        if (!data || !data.success)
          return $q.reject(res);
        $scope.formLoading = false;
        $scope.showLogin();
        return true;
      })
      .catch(function() {       
        $scope.formLoading = false;
        $scope.isLoginError = true;
      });
  }
  
  $scope.closeDialog = function() {
    $modalInstance.dismiss('cancel');
  }
}


