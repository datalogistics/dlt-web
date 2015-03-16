function downloadMapController($scope, $location, $http, UnisService, SocketService) {
  var sessionIds = $location.search().sessionIds.split(",")
  console.log("ids:", sessionIds )

  var map = baseMap("#downloadMap", 960, 500);
  $scope.services = UnisService.services;
  $http.get('/api/natmap')
    .then(function(res) {
      var natmap = res.data;
      allServiceData($scope.services, "ibp_server", natmap,
		     mapPoints(map.projection, map.svg, "depots"));

      sessionIds.forEach(function(id) {
	console.log("init for ", id)
	SocketService.emit("peri_download_request", {id : id});
      })
    });

// -----------------------------------------------
// Download Map data acquisition/basic processing
  var getAccessIp = function(x){
    return ((x.accessPoint || "").split("://")[1] || "").split(":")[0] || ""; 
  };

  SocketService.on("peri_download_info", function(data){
    // Set this data in scope to display file info
    console.log('Download file data ' , data);
    if (data.isError) {return;}
    initProgressTarget(map.svg, 30, 300, data.sessionId, data.filename, data.size)
  });
  
  SocketService.on("peri_download_clear", function(data){
    console.log("Download cleared", data)
  })


  var rateTracker = {}
  SocketService.on("peri_download_progress",function(data){
    var sessionId = data.sessionId
    var s = data.size;
    var host = data.host;
    var progress = (data.length / s ) * 100 ;
    var offset = (data.offset/ s )  * 100;
    if (isNaN(progress)) {progress = 0;}

    var rateInfo = rateTracker[sessionId] || {minTime: data.timestamp, maxTime: data.timestamp+1, totalBytes:0}
    rateInfo.minTime = Math.min(rateInfo.minTime, data.timestamp)
    rateInfo.maxTime = Math.max(rateInfo.maxTime, data.timestamp)
    rateInfo.totalBytes = rateInfo.totalBytes + data.length
    rateTracker[sessionId] = rateInfo
    
    //TODO: This skip-if-not found is because there is no way to un-register a socket on the node side
    //      Doing so would probably require recording client ids on the client, and unregistering them by id on page close 
    //      As is, the unwanted ones just expire when the download is done.  In the mean time, extra messages get sent
    if (sessionIds.indexOf(sessionId) < 0) {return}

    if(progress > 100 && offset > 100){
      console.log("Incorrect data -- progress: " + progress, "Offset: " + offset)
    } else {
      doProgressWithOffset(map.svg, host, sessionId, progress, offset);
      reportRate(map.svg, sessionId, rateInfo)
    }
  });

  
  $scope.$on("$destroy", function() {
    d3.selectAll("#map-tool-tip").each(function() {this.remove()})  //Cleans up the tooltip object when you navigate away
    SocketService.getSocket().removeAllListeners("peri_download_info")
    SocketService.getSocket().removeAllListeners("peri_download_progress")
    SocketService.getSocket().removeAllListeners("peri_download_clear")
  })


  // -------------------------------------------
  //   Download map visualization components
  function targetId(id) {return "download-target-"+id;}

  function reportRate(svg, sessionId, rateInfo) {
    var rate = rateInfo.totalBytes/((rateInfo.maxTime - rateInfo.minTime)/1000)
    var magnitude = Math.floor(Math.log(rate)/Math.log(1024))
    var suffix = " B/sec"

    if (magnitude == 1) {
      suffix = " KB/sec (avg)"
      rate = rate/1024
    } else if (magnitude == 2) {
      suffix = " MB/sec (avg)" 
      rate = rate/Math.pow(1024,2)
    } else if (magnitude > 2) {
      suffix = " GB/sec (avg)" 
      rate = rate/Math.pow(1024,3)
    }

    var target = svg.select("#download-rate-" + targetId(sessionId))
    target.text(rate.toFixed(1) + suffix)
  }

  function downloadFragmentBar(svg, sessionId, barClass, color, barOffset, barHeight) {
    var downloads = svg.select("#downloads") 
    var target = svg.select("#" + targetId(sessionId))
    var targetLeft = parseInt(target.attr("target-left"))
    var targetWidth = parseInt(target.attr("target-width"))

    downloads.append('rect')
      .attr("class", "download-part")
      .attr("fill", color)
      .attr("width", targetWidth)
      .attr("height", barHeight)
      .attr('x', targetLeft)
      .attr('y', barOffset);
  }


  function nodeRecolor(node) {
    var colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf", //darker
                  "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5", "#c49c94", "#f7b6d2", "#c7c7c7", "#dbdb8d", "#9edae5"] //lighter

    node = node.node() //Move out of d3 into vanilla DOM
    var total = node.parentNode.childNodes.length;
    var i =0
    while ( (node = node.previousSibling) != null) {i++;}
    var color = colors[i%20]
    return color 
  }

  function moveLineToProgress(svg, sessionId, mapNode, barOffset, barHeight){
    var target = svg.select("#" + targetId(sessionId))
    var targetLeft = parseInt(target.attr("target-left"))
    var targetHeight = parseInt(target.attr("target-height"))
    
    var end = [targetLeft, barOffset];
    var mapGroup = d3.select(mapNode.node().parentNode)
    var start = d3.transform(mapGroup.attr("transform")).translate

    var color = nodeRecolor(mapGroup)

    mapGroup.select(".depotNode")
        .attr("fill", color)
        .attr("stroke", "#555")

    mapGroup.select(".count")
       .attr("fill", "#111")
         
    svg.append('line')
      .attr('x1',start[0])
      .attr('y1',start[1])
      .attr('x2',start[0])
      .attr('y2',start[1])
      .attr("stroke-width", 2)
      .attr("stroke", color)
      .transition().duration(500)
         .attr('x2',end[0])
         .attr('y2', end[1])
      .each("end", function(){downloadFragmentBar(svg, sessionId, "source-found-segment", color, barOffset, barHeight)})
      .transition().duration(500).remove();
  }

  // svg -- svg root to work with
  // id -- Id of the source node
  // progress -- Percentage of the file just read
  // offset -- Percent offset of the newest chunk
  function doProgressWithOffset(svg, sourceId, sessionId, progress , offsetPercent){
    //Calculate geometry of the progress bar chunk
    var target = svg.select("#" + targetId(sessionId))
    if (target.empty()) {console.error("Failed attempt to update " + sessionId); return;}

    var targetTop = parseInt(target.attr("target-top"))
    var targetLeft = parseInt(target.attr("target-left"))
    var targetHeight = parseInt(target.attr("target-height"))
    
    var ratio = targetHeight / 100 ;
    var barOffset = targetTop + (offsetPercent || 0) * ratio;
    var barHeight = ratio * progress;
    if (barHeight == 0 || isNaN(barHeight)) {barHeight=.1}

    //Find the source location node
    var nodes = svg.selectAll(".depotLocation").filter(function(d) {return this.getAttribute("name") == sourceId})
    if (nodes.empty()) {
      console.log("DownloadProgress: Node not found " + sourceId)
      downloadFragmentBar(svg, sessionId, "source-not-found-segment", "#222222", barOffset, barHeight)
      return;}

    var mapNode = d3.select(nodes[0][0]) //ensures we have exactly one item as the source
    moveLineToProgress(svg, sessionId, mapNode, barOffset, barHeight);
  }

  function initProgressTarget(svg, width, height, sessionId, fileName) {
    var allDownloads = svg.select("#downloads")
    if (allDownloads.empty()) {allDownloads = svg.append("g").attr("id", "downloads")}

    var count = allDownloads.select(".download-target").size()
    var left = svg.attr("width")-(width+15)*count //requested width, plus a pad
    var top = svg.attr("height")/2 - height/2

    var g = allDownloads.append("g").attr("class", "download-entry")
    g.attr("transform", "translate(" + left + "," + top + ")")

    g.append("rect")
        .attr("id", targetId(sessionId))
        .attr("class", "download-target")
        .attr("fill", "#bbb")
        .attr("width", width)
        .attr("height", height)
        .attr("target-width", width)
        .attr("target-height", height)
        .attr("target-top", top)
        .attr("target-left", left)
        .attr("progress-start", 0)
    
    g.append("text")
        .attr("id", "download-rate-" + targetId(sessionId))
        .attr("class", "download-rate-label")
        .text("-- B/sec")
        .attr("text-anchor", "end")
        .attr("fill", "#777")
        .attr("transform", "translate(0," + height + ")")
        .attr("writing-mode", "tb")
        .attr("baseline-shift", "-4.5px")

    g.append("text")
        .attr("class", "download-label")
        .text(fileName)
        .attr("baseline-shift", "-4.5px")
        .attr("text-anchor", "start")
        .attr("fill", "#777")
        .attr("writing-mode", "tb")
  }

} // end controller
