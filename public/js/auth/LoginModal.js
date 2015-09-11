function loginModal($scope,$modalInstance,$rootScope,$q,$http) {

  $scope.isLogin = true;
  $scope.showLogin = function() {  $scope.isLogin = true; };
  $scope.showRegister = function() { $scope.isLogin = false; };
  $scope.formLoading = false;
  // $scope.loginForm = {};
  $scope.login = function() {
    var uname = $("input[name=loginFormEmail]").val();
    var pwd = $("input[name=loginFormPwd]").val();
    $scope.formLoading = true;
    $http.post("/login",{ email : uname,password: pwd})
      .then(function (res) {
        var data = res.data;
        if (!data || !data.success)
          return $q.reject();
        $scope.formLoading = false;
        $modalInstance.close();
        $rootScope.loggedIn = true;
        $rootScope.userData = {
          email : uname
        };
      })
      .catch(function() {
        $scope.formLoading = false;
        $rootScope.loggedIn = false;
      })
  }

  $scope.register = function() {
    var uname = $("input[name=regFormEmail]").val();
    var pwd = $("input[name=regFormPwd]").val();
    var cpwd = $("input[name=regFormCPwd]").val();
    var name = $("input[name=regFormName]").val();
    $scope.formLoading = true;
    $http.post("/register",{ name: name , email : uname,password: pwd, cpassword : cpwd})
      .then(function(res) {
        var data = res.data;
        if (!data || !data.success)
          return $q.reject(res);
        $scope.formLoading = false;
        $scope.showLogin();
      })
      .catch(function() {       
        $scope.formLoading = false;        
      });
  }
  
  $scope.closeDialog = function() {
    $modalInstance.dismiss('cancel');
  }
}


