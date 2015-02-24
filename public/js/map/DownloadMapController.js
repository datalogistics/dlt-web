function downloadMapController($scope, $routeParams, $http, UnisService, SocketService) {
  var map = baseMap("#downloadMap", 960, 500);
  $scope.services = UnisService.services;
  allServiceData($scope.services, mapPoints(map.projection, map.svg, "depots"));
  
  //Cleans up the tooltip object when you navigate away
  $scope.$on("$destroy", function() {
    d3.selectAll("#map-tool-tip").each(function() {this.remove()})
  })

  var getAccessIp = function(x){
    return ((x.accessPoint || "").split("://")[1] || "").split(":")[0] || ""; 
  };

  SocketService.emit("eodnDownload_request",{ id : $routeParams.id});
  console.log("fine till here " , $routeParams.id);

  k = $scope ;
  SocketService.on("eodnDownload_Info", function(data){
    // Set this data in scope to display file info
    console.log('file data ' , data);
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
    var ip = d.ip;
    var pr = d.progress;
    var sizeOfChunk = d.amountRead || pr;
    var progress = (sizeOfChunk / s ) * 100 ;
    var offset = (d.offset/ s )  * 100;
    if(progress > 100 || offset > 100){
      alert('wrong data ....');
    }
    doProgressWithOffset(map.svg, ip,progress, offset);
  });




} // end controller


