var rc = 0;

function downloadMapController($scope, $location, $http, UnisService, SocketService) {
  var allIds = $location.search().sessionIds
  var limitSessionIds = []
  if (allIds != undefined && allIds.trim() != "") {limitSessionIds = allIds.split(",")}
  console.log("ids:", limitSessionIds)

  var svg = d3.select("#downloadMap").append("svg")
               .attr("width", 1200)
               .attr("height", 500)

  var map = baseMap("#downloadMap", 960, 500, svg);

  var detailSessions = limitSessionIds.slice()
  var sessionIds = []

  $scope.services = UnisService.services
  $http.get('/api/natmap')
    .then(function(res) {
      var natmap = res.data;
      allServiceData($scope.services, "ibp_server", natmap,
        mapPoints(map.projection, map.svg, "depots"));

      limitSessionIds.forEach(function(id) {
        console.log("init for ", id)
        sessionIds.push(id)
        SocketService.emit("peri_download_request", {id : id});
      })
      return natmap
    })
    .then(function(natmap) {backplaneLinks(map, natmap)})
  
  $scope.$on("$destroy", function() {
    d3.selectAll("#map-tool-tip").each(function() {this.remove()})  //Cleans up the tooltip object when you navigate away
    SocketService.getSocket().removeAllListeners("peri_download_info")
    SocketService.getSocket().removeAllListeners("peri_download_progress")
    SocketService.getSocket().removeAllListeners("peri_download_clear")
    SocketService.getSocket().removeAllListeners("peri_download_list_info")
    SocketService.getSocket().removeAllListeners("peri_download_listing")
  })


  //Manage full listing ----------------------------------
  if (limitSessionIds.length == 0) {
    console.log("Retrieving full session listing...")
    SocketService.on("peri_download_listing", function(data) {
      console.log("Listing recieved", data)
      data.forEach(function(entry) {
        console.log("listing init for ", entry.sessionId)
        sessionIds.push(entry.sessionId)
        detailSessions.push(entry.sessionId)
        SocketService.emit("peri_download_request", {id : entry.sessionId});
      })
      //TODO: May turn details off is total number of sessions exceeds some number...
    })

    //Get updates
    SocketService.on("peri_download_list_info", function(data) {
      console.log("New download received", data)
      if (sessionIds.length == detailSessions.length) {
        detailSessions.push(data.sessionId)
      }
      sessionIds.push(data.sessionId)
      SocketService.emit("peri_download_request", {id : data.sessionId});
    })

    //Request what is currently loaded...
    SocketService.emit("peri_download_req_listing", {});
  }
  
  //Update toggle tracking ----------------------------------------------
  function showUpdates(sessionId, show) {
      if (show == true) {
        var idx = detailSessions.indexOf(sessionId)
        if (idx < 0) {detailSessions.push(sessionId)}
      } else {
        var idx = detailSessions.indexOf(sessionId)
        if (idx >= 0) {detailSessions.splice(idx, 1)}
      }
  }

  function toggleUpdates(toState) {
    var e = d3.select(this)
    var newState = toState !== undefined ? toState : !e.classed("toggle-details-true")
    if (newState == true) {
      e.classed("toggle-details-true", true)
       .classed("toggle-details-false", false)
      showUpdates(e.attr("sessionId"), true)
    } else {
      e.classed("toggle-details-true", false)
       .classed("toggle-details-false", true)
      showUpdates(e.attr("sessionId"), false)
    }
  }

  //Toggle detailing on for all sessions
  function detailAllSessions() {
    detailSessions = []
    var all = svg.selectAll(".toggle-details")
    all.each(function (d, i) {
      var item = d3.select(this)
      toggleUpdates.call(this, true)
    })
  }

  //Toggle detailing off for all sessions
  function detailNoSessions() {
    detailSessions = []
    svg.selectAll(".toggle-details")
      .classed("toggle-details-true", false)
      .classed("toggle-details-false", true)
  }

  $scope.detailAll = detailAllSessions 
  $scope.detailNone = detailNoSessions 

  $scope.resetFilter = function() {$location.path("/downloads").search("sessionIds", undefined)}
  $scope.filterSessions = function() {
    if (detailSessions.length == 0) {return;}
    //var url = "/downloads/map"
    //var url = "/downloads/filter\?sessionIds="+detailSessions.join(",")
    //console.log(url) 
    //$location.path(url)
    $location.path("/downloads").search("sessionIds", detailSessions.join(","))
  }
  
  //Mapping of downloads ----------------------------------------------
  var getAccessIp = function(x){
    return ((x.accessPoint || "").split("://")[1] || "").split(":")[0] || ""; 
  };

  SocketService.on("peri_download_info", function(data){
    // Set this data in scope to display file info
    if (data.isError) {return;}
    initProgressTarget(map.svg, 200, 30, data)
  });

  SocketService.on("peri_download_clear", function(data){
    console.log("Download cleared", data)
    var allDownloads = svg.select("#downloads")
    allDownloads.select("#"+groupId(data['sessionId'])).remove()
    //TODO: Modify the entry to indicate it was 'cleared' on the server
  })

  var rateTracker = {}
  SocketService.on("peri_download_progress",function(data){
    var sessionId = data.sessionId
    var size = data.size;
    var host = data.host;
    var progress = (data.length / size) * 100 ;
    var offsetPercent = (data.offset/ size);
    if (isNaN(progress)) {progress = 0;}

    var rateInfo = rateTracker[sessionId] || {minTime: data.timestamp, maxTime: data.timestamp+1, totalBytes:0}
    rateInfo.minTime = Math.min(rateInfo.minTime, data.timestamp)
    rateInfo.maxTime = Math.max(rateInfo.maxTime, data.timestamp)
    rateInfo.totalBytes = rateInfo.totalBytes + data.length
    rateTracker[sessionId] = rateInfo

    var percent = ((rateInfo.totalBytes/size)*100).toFixed(1)
    var speed = formatRate(data.sesisonId, rateInfo)
    updateProgressTarget(svg, data.sessionId, percent, speed)

    if (sessionIds.indexOf(sessionId) < 0) {return} // Actively ignore this item entirely...
    
    if(progress > 100 && offsetPercent > 1){
      console.log("Incorrect data -- progress: " + progress, "Offset: " + offsetPercent)
    } else {
      var detail = detailSessions.indexOf(sessionId) >= 0
      doProgressWithOffset(map.svg, host, sessionId, progress, offsetPercent, detail);
    }
  });


  // -------------------------------------------
  //   Download map visualization components
  function groupId(id) {return "sesison-"+id;}
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
    var group = svg.select("#" + groupId(sessionId))
    var downloads = group.select(".download-ticks")
    var target = group.select(".download-target") 
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

  function moveLineToProgress(svg, sessionId, mapNode, offsetPercent, barOffset, barSize){
    var target = svg.select("#" + groupId(sessionId)).select(".download-target")
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
         .attr("x2", targetLeft)
         .attr('y2', targetTop + targetHeight*offsetPercent)
      .each("end", function(){downloadFragmentBar(svg, sessionId, "source-found-segment", color, barOffset, barSize)})
      .transition().duration(500).remove();
  }

  // svg -- svg root to work with
  // id -- Id of the source node
  // progress -- Percentage of the file just read
  // offset -- Percent offset of the newest chunk
  function doProgressWithOffset(svg, sourceId, sessionId, progress, offsetPercent, detail){
    //Calculate geometry of the progress bar chunk
    var target = svg.select("#" + groupId(sessionId)).select(".download-target")
    if (target.empty()) {console.error("Failed attempt to update " + sessionId); return;}

    var targetSize = parseInt(target.attr("target-width"))

    var ratio = targetSize / 100 ;
    var barOffset = (offsetPercent*100|| 0) * ratio;
    var barSize = ratio * progress;
    if (barSize == 0 || isNaN(barSize)) {barSize = .1}

    //Find the source location node
    var nodes = svg.selectAll(".depotLocation").filter(function(d) {return this.getAttribute("name") == sourceId})
    if (nodes.empty()) {
      console.log("DownloadProgress: Node not found " + sourceId)
      downloadFragmentBar(svg, sessionId, "source-not-found-segment", "#222222", barOffset, barSize)
      return;}

    var mapNode = d3.select(nodes[0][0]) //ensures we have exactly one item as the source

    if (detail && detail == true) {
      moveLineToProgress(svg, sessionId, mapNode, offsetPercent, barOffset, barSize);
    } else {
      var mapGroup = d3.select(mapNode.node().parentNode)
      var color = nodeRecolor(mapGroup)
      downloadFragmentBar(svg, sessionId, "source-not-found-segment", color, barOffset, barSize)
    }
  }

  function initProgressTarget(svg, width, height, entry) {
    var sessionId=entry.sessionId
    var allDownloads = svg.select("#downloads")
    if (allDownloads.empty()) {allDownloads = svg.append("g").attr("id", "downloads")}

    var mapWidth = parseInt(svg.select("#map").attr("width"))

    var count = allDownloads.selectAll(".download-target").size()
    var left = mapWidth + 30
    rc = (rc+1)%12
    var top = 100 + rc*(1.5*height)

    var g = allDownloads.append("g")
                 .attr("class", "download-entry")
                 .attr("id", groupId(sessionId))
                 .attr("transform", "translate(" + left + "," + top + ")")

    g.append("rect")
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
        .attr("class", "percent-complete inverseText")
        .text("---")
        .attr("x", width/3)
        .attr("y", height/2+4)

    g.append("text")
        .attr("class", "size inverseText")
        .text((entry.size/1e6).toFixed(1) + " MB")
        .attr("x", width/3*2)
        .attr("y", height/2+4)

    g.append("text")
        .attr("class", "speed")
        .text("---")
        .attr("x", width + 20)
        .attr("y", height-4)

    g.append("text")
        .attr("class", "download-label")
        .text(entry.filename)
        .attr("text-anchor", "left")
        .attr("x", width + 20)
        .attr("y", 10)
    
    var updates = g.append("rect")
        .attr("class", "toggle-details toggle-details-true")
        .attr("x", width + 4)
        .attr("y", height/2-(height/2.5/2))
        .attr("rx", 2)
        .attr("ry", 2)
        .attr("width", height/2.5)
        .attr("height", height/2.5)
        .attr("sessionId", sessionId)
        .on('click', toggleUpdates)
  }
  
  function updateProgressTarget(svg, sessionId, percent, speed) {
    var spd = svg.select("#" + groupId(sessionId)).select(".speed")
    var pct = svg.select("#" + groupId(sessionId)).select(".percent-complete")

    spd.text(speed)
    pct.text(percent + " %")
  }
} // end controller
