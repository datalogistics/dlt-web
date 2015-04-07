function downloadMapController($scope, $location, $http, UnisService, SocketService) {
  var allIds = $location.search().sessionIds
  if (allIds == undefined) {allIds = ""}
  var sessionIds = allIds.split(",")
  console.log("ids:", sessionIds )

  var svg = d3.select("#downloadMap").append("svg")
               .attr("width", 1200)
               .attr("height", 500)

  var map = baseMap("#downloadMap", 960, 500, svg);

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
      return natmap
    })
    .then(function(natmap) {backplaneLinks(map, natmap)})


// -----------------------------------------------
// Download Map data acquisition/basic processing
  var getAccessIp = function(x){
    return ((x.accessPoint || "").split("://")[1] || "").split(":")[0] || ""; 
  };

  $scope.downloads = {}

  SocketService.on("peri_download_info", function(data){
    // Set this data in scope to display file info
    console.log('Download file data ' , data);
    if (data.isError) {return;}
    initProgressTarget(map.svg, 200, 30, data.sessionId, data.filename, data.size)
  });

  SocketService.on("peri_download_clear", function(data){
    console.log("Download cleared", data)
  })

  var rateTracker = {}
  SocketService.on("peri_download_progress",function(data){
    var sessionId = data.sessionId
    var size = data.size;
    var host = data.host;
    var progress = (data.length / size) * 100 ;
    var offset = (data.offset/ size)  * 100;
    if (isNaN(progress)) {progress = 0;}

    var rateInfo = rateTracker[sessionId] || {minTime: data.timestamp, maxTime: data.timestamp+1, totalBytes:0}
    rateInfo.minTime = Math.min(rateInfo.minTime, data.timestamp)
    rateInfo.maxTime = Math.max(rateInfo.maxTime, data.timestamp)
    rateInfo.totalBytes = rateInfo.totalBytes + data.length
    rateTracker[sessionId] = rateInfo

    var percent = ((rateInfo.totalBytes/size)*100).toFixed(1)
    var speed = formatRate(data.sesisonId, rateInfo)
    updateProgressTarget(svg, data.sessionId, percent, speed)


    //TODO: This skip-if-not found is because there is no way to un-register a socket on the node side
    //      Doing so would probably require recording client ids on the client, and unregistering them by id on page close 
    //      As is, the unwanted ones just expire when the download is done.  In the mean time, extra messages get sent
    if (sessionIds.indexOf(sessionId) < 0) {return}

    if(progress > 100 && offset > 100){
      console.log("Incorrect data -- progress: " + progress, "Offset: " + offset)
    } else {
      doProgressWithOffset(map.svg, host, sessionId, progress, offset);
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
  function formatRate(sessionId, rateInfo) {
    var rate = rateInfo.totalBytes/((rateInfo.maxTime - rateInfo.minTime)/1000)
    var magnitude = Math.floor(Math.log(rate)/Math.log(1024))
    var suffix = " B/sec"

    if (magnitude == 1) {
      suffix = " KB/sec"
      rate = rate/1024
    } else if (magnitude == 2) {
      suffix = " MB/sec"
      rate = rate/Math.pow(1024,2)
    } else if (magnitude > 2) {
      suffix = " GB/sec"
      rate = rate/Math.pow(1024,3)
    }
    return rate.toFixed(1) + suffix
  }

  function downloadFragmentBar(svg, sessionId, barClass, color, barOffset, barSize) {
    var downloads = svg.select("#downloads").select("#session-"+sessionId).select(".download-ticks")
    var target = svg.select("#" + targetId(sessionId))
    var targetOffset = 0 
    var targetSize = parseInt(target.attr("target-height"))

    downloads.append('rect')
      .attr("class", "download-part")
      .attr("fill", color)
      .attr("width", barSize)
      .attr("height", targetSize)
      .attr('x', barOffset)
      .attr('y', targetOffset);
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

  function moveLineToProgress(svg, sessionId, mapNode, barOffset, barSize){
    var target = svg.select("#" + targetId(sessionId))
    var targetTop = parseInt(target.attr("target-top"))
    var targetLeft = parseInt(target.attr("target-left"))
    var targetHeight = parseInt(target.attr("target-height"))

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
         .attr('x2',barOffset+targetLeft)
         .attr('y2', targetTop)
      .each("end", function(){downloadFragmentBar(svg, sessionId, "source-found-segment", color, barOffset, barSize)})
      .transition().duration(500).remove();
  }

  // svg -- svg root to work with
  // id -- Id of the source node
  // progress -- Percentage of the file just read
  // offset -- Percent offset of the newest chunk
  function doProgressWithOffset(svg, sourceId, sessionId, progress, offsetPercent){
    //Calculate geometry of the progress bar chunk
    var target = svg.select("#" + targetId(sessionId))
    if (target.empty()) {console.error("Failed attempt to update " + sessionId); return;}

    var targetSize = parseInt(target.attr("target-width"))

    var ratio = targetSize / 100 ;
    var barOffset = (offsetPercent || 0) * ratio;
    var barSize = ratio * progress;
    if (barSize == 0 || isNaN(barSize)) {barSize = .1}

    //Find the source location node
    var nodes = svg.selectAll(".depotLocation").filter(function(d) {return this.getAttribute("name") == sourceId})
    if (nodes.empty()) {
      console.log("DownloadProgress: Node not found " + sourceId)
      downloadFragmentBar(svg, sessionId, "source-not-found-segment", "#222222", barOffset, barSize)
      return;}

    var mapNode = d3.select(nodes[0][0]) //ensures we have exactly one item as the source
    moveLineToProgress(svg, sessionId, mapNode, barOffset, barSize);
  }

  //TODO: Add size...probably take the whole info object as an arg instead of just parts...
  function initProgressTarget(svg, width, height, sessionId, fileName) {
    var allDownloads = svg.select("#downloads")
    if (allDownloads.empty()) {allDownloads = svg.append("g").attr("id", "downloads")}

    var mapWidth = parseInt(svg.select("#map").attr("width"))

    var count = allDownloads.selectAll(".download-target").size()
    var left = mapWidth + 150
    var top = 100 


    var g = allDownloads.append("g")
                 .attr("class", "download-entry")
                 .attr("id", "session-"+sessionId)
                 .attr("transform", "translate(" + left + "," + top + ")")

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

    g.append("g").attr("class", "download-ticks")

    g.append("text")
        .attr("class", "percent-complete")
        .text("---")
        .attr("text-anchor", "middle")
        .attr("fill", "#FFF")
        .attr("x", width/2)
        .attr("y", height/2+4)
    
    g.append("text")
        .attr("class", "speed")
        .text("---")
        .attr("x", width + 15)
        .attr("y", height/2+4)

    g.append("text")
        .attr("class", "download-label")
        .text(fileName)
        .attr("text-anchor", "left")
        .attr("x", width + 100)
        .attr("y", height/2+4)

    
  }

  function updateProgressTarget(svg, sessionId, percent, speed) {
    var spd = svg.select("#session-"+sessionId).select(".speed")
    var pct = svg.select("#session-"+sessionId).select(".percent-complete")

    spd.text(speed)
    pct.text(percent + " %")
  }
} // end controller
