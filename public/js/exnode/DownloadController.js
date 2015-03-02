/*
 * Download Page Controller
 * public/js/exnode/
 * DownloadController.js
 */

function downloadController($scope, SocketService) {
  // find active download IDs and display, links to map for viz

  //Listen to what is currently loaded
  SocketService.on("eodnDownload_listing", function(data) {
    console.log("Listing recieved", data)

    $scope.downloads = data
  })

  //Request what is currently loaded...
  SocketService.emit("eodnDownload_reqListing", {});
}
