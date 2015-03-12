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
  SocketService.on("peri_download_info", function(data) {
    console.log("New download received", data)
    $scope.downloads.push(data)
  })
  
  //Request what is currently loaded...
  SocketService.emit("peri_download_req_listing", {});

  $scope.mapSelected = function() {
    if ($scope.selectedDownloads.length == 0) {return;}
    $windowlocation.path("/"+$scope.selectedDownloads[0])
  }

  $scope.$on("$destroy", function() {
    SocketService.getSocket().removeAllListeners() //Disconnect listening sockets
  })


}
