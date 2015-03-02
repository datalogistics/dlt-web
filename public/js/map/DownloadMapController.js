function downloadMapController($scope, $routeParams, $http, UnisService, SocketService) {
  var map = baseMap("#downloadMap", 960, 500);
  $scope.services = UnisService.services;
  allServiceData($scope.services, mapPoints(map.projection, map.svg, "depots"));
  
 initProgressTarget(map.svg, 30, 300)

  var getAccessIp = function(x){
    return ((x.accessPoint || "").split("://")[1] || "").split(":")[0] || ""; 
  };

  SocketService.emit("eodnDownload_request",{ id : $routeParams.id});

  SocketService.on("eodnDownload_Info", function(data){
    // Set this data in scope to display file info
    console.log('Download file data ' , data);
    if(data.isError){
      $scope.error = true;
    } else {
      $scope.error = false;
      $scope.name = data.name ,
    $scope.size = data.size , 
    $scope.connections = data.connections;						
    }
  });

  SocketService.on("eodnDownload_Progress",function(data){
    var s = data.totalSize ;
    var d = data ;
    var depotId = d.ip;
    var progress = (d.amountRead / s ) * 100 ;
    var offset = (d.offset/ s )  * 100;
    if (isNaN(progress)) {progress = 0;}

    if(progress > 100 && offset > 100){
      console.log("Incorrect data -- progress: " + progress, "Offset: " + offset)
    } else {
      doProgressWithOffset(map.svg, depotId, progress, offset);
    }
  });

  
  $scope.$on("$destroy", function() {
    d3.selectAll("#map-tool-tip").each(function() {this.remove()})  //Cleans up the tooltip object when you navigate away
    SocketService.getSocket().removeAllListeners() //Disconnect listening sockets
  })
} // end controller


