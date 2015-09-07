function loginModal($scope,$modalInstance) {
  function done() {
    $modalInstance.close();
  }

  $scope.isLogin = true;
  $scope.showLogin = function() {  $scope.isLogin = true; };
  $scope.showRegister = function() { $scope.isLogin = false; };
  
  $scope.login = function() {
    alert('das');
    var isValid = false;
    if (isValid) 
      done();
  }

  $scope.register = function() {
    alert('reg');
    var isValid = false;
    if (isValid) 
      done();
  }
  
  $scope.closeDialog = function() {
    $modalInstance.dismiss('cancel');
  }
}


