/*
 * Download Page Controller
 * public/js/exnode/
 * DownloadController.js
 */

function downloadController($scope, SocketService) {
  // find active download IDs and display, links to map for viz
  $scope.selectedDownloads = [] 
  $scope.downloadsLink = ""

  $scope.toggleDownloadSelection = function(sessionId) {
    var idx = $scope.selectedDownloads.indexOf(sessionId);
    // is currently selected
    if (idx > -1) {$scope.selectedDownloads.splice(idx, 1);}
    else {
      $scope.selectedDownloads.push(sessionId)
    }
    $scope.downloadsLink = "sessionIds=" + $scope.selectedDownloads.join()
  }

  //Listen to what is currently loaded
  SocketService.on("peri_download_listing", function(data) {
    console.log("Listing recieved", data)
    $scope.downloads = data
  })

  //Get updates
  SocketService.on("peri_download_list_info", function(data) {
    console.log("New download received", data)
    $scope.downloads.push(data)
  })
  
  //Request what is currently loaded...
  SocketService.emit("peri_download_req_listing", {});

  $scope.mapSelected = function() {
    if ($scope.selectedDownloads.length == 0) {return;}
    $windowlocation.path("/"+$scope.selectedDownloads[0])
  }
  
  SocketService.on("peri_download_clear", function(data){
    console.log("Download cleared", data)
    var delIdx = []
    for (i =0; i<$scope.downloads.length; i++) {
      if ($scope.downloads[i].sessionId == data.sessionId) {delIdx.push(i)}
    }
    delIdx.forEach(function() {$scope.downloads.splice(delIdx, 1)})
  })

  $scope.$on("$destroy", function() {
    SocketService.getSocket().removeAllListeners() //Disconnect listening sockets
  })


}
