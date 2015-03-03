// Add a highlight halo to a specified map item(s).
// 
// svg -- Root svg element to find things in
// selector -- An svg selector for items.  
// filter -- A predicate run on selected items
function highlightMapLocations(svg, selector, filter, retries) {
  if (filter === undefined) {filter = function(d,i) {return true;}}
 
  var items = svg.selectAll(selector).filter(filter)

  if (items.empty()) {
    if (retries === undefined) {retries = 20;}
    if (retries > 0) {
      console.log("Retry highlight")
      setTimeout(function() {highlightMapLocations(svg, selector, filter, retries-1)}, 1000)
    }
    return;
  }

  items.each(
      function(d, i) {
        var id = "highlight" + this.id
        d3.select(this.parentNode).append("circle")
            .attr("id", id)
            .attr("r", 20)
            .attr('stroke-width', 0)
            .attr("stroke", "#76231F")
            .attr("fill", "none")
            .each(__pulse)

      function __pulse() {
        var circle = svg.select("#" + id);
        (function repeat() {
          circle = circle.transition()
            .duration(2000)
            .attr("stroke-width", 2)
            .attr("r", 1)
            .transition()
            .duration(10)
            .attr('stroke-width', 0)
            .attr("r", 20)
            .ease('sine')
            .each("end", repeat);
        })();
      }

      });
}

//Add the tool tip functionality
function tooltip(svg) {
  if (d3.select("#map-tool-tip").empty()) {
    tip = d3.tip()
              .attr('class', 'd3-tip')
              .attr('id', "map-tool-tip")
              .html(function() {
                var x = d3.select(this);
                return x.attr('name').replace(/\|/g, "</p>")
              })

    svg.call(tip);
  }

  var timer;
  svg.selectAll("circle.eodnNode").on('mouseover', function(){
      clearTimeout(timer);
      tip.show.apply(this,arguments);
  })
  .on('mouseout', function(){
    timer = setTimeout(tip.hide,2000);
  });
}


//Add a node with name at position latLon to svg using the projection
//TODO: Refactor so the invisible point is always added, reduce duplciate code
function addMapLocation(projection, name, rawLonLat, svg, depot_id, depot_ip) {		
  var lonLat = [rawLonLat[0].toFixed(2), rawLonLat[1].toFixed(2)] //Round lat/lon

  var translate = "translate(" + projection(lonLat) + ")"
  var nodes = svg.selectAll(".eodnGroup").filter(function (d, i) { return d3.select(this).attr("transform") == translate })

  //Function to add an invisible point to each location
  var invisiblePoint = function(parentGroup) {
      var circ = parentGroup.append("circle")
         .attr("r", 1)
         .attr("class", "eodnLocation")
         .attr("name", name)
         .attr("style", "display:none")
         .attr("depot_ip", name)

      if (depot_id !== undefined) {circ.attr('depot_id', depot_id)}
      if (depot_ip !== undefined) {circ.attr('depot_ip', depot_ip)}
  }

  if (nodes.empty()) {
    var group = svg.append("g")
        .attr("transform", function() {return translate;})
        .attr("class", "eodnGroup")

    var circ = group.append("circle")
        .attr("r",7)
        .attr('fill',"#B4635F")
        .attr('stroke',"#76231F")
        .attr('stroke-width', '1.25')
        .attr('class', "eodnNode")
        .attr('name', name)
        .attr('location', lonLat)

    invisiblePoint(group)
  } else {
    nodes.each(function(d,i) {
      var group = d3.select(this)
      var count = group.select(".count")
      if (count.empty()) {
        group.append("text")
            .text(function (d) {return 2})
            .attr("class", "count")
            .attr("baseline-shift", "-4.5px")
            .attr("text-anchor", "middle")
            .attr("fill", "#D99490")
      } else{
        var val = parseInt(count.text())
        val = val + 1;
        count.text(function (d) {return val})
      }

      var super_circ = group.select(".eodnNode")
      var existingName = super_circ.attr("name")
      super_circ.attr("name", name + "|" + existingName)
      invisiblePoint(group)
    })
  }
}


//Add nodes to the side of the map, because their lat/lon is not known
//baseLataLon tells where to put the first off map location.  Others are placed in a line down from there.
function addOffMapLocation(projection, idx, baseLatLon, name, svg, depot_id, depot_ip) {
    pair = [baseLatLon[0]-idx*.3, baseLatLon[1]-idx]  //the idx*.3 straigthens out the line
    node = addMapLocation(projection, name, pair, svg, depot_id, depot_ip)
    node.append("text")
       .attr("dx", function(d){return 10})
       .attr("dy", function(d){return 4})
       .text(function(d) {return name})
}


//Map a collection of places.  The places should be a list of dictionaries {name, location}.
//Location should be either {latitude, longitude} or []
//If location is [], then the item is placed off map with a printed label
function mapPoints(projection, svg, elementId) {
  return function(points) {
    var svg_points = svg.select("#overlay")

    points.forEach(function(item) {
      if (item.location.length == 0
         || item.location.latitude == undefined
         || item.location.longitude == undefined
         || (item.location.latitude == 0 && item.location.longitude == 0)) {
        
        offmap = parseInt(svg.select("layout-data").attr("off-map-count"))
        svg.select("layout-data").attr("off-map-count", offmap+1)
        addOffMapLocation(projection, offmap, [-72, 40], item.name, svg_points, item.depot_id)
      } else {
        pair = [item.location.longitude, item.location.latitude]
        node = addMapLocation(projection, item.name, pair, svg_points, item.depot_id)
      }
      tooltip(svg)
    })
  }
}

//Draws the US Map in.
//selector -- used to grab an element of the page and append svg into into it
//width -- how wide to make the map
//height -- how tall to make the map
//returns the map projection 
function baseMap(selector, width, height) {
  projection = d3.geo.albersUsa()
      .scale(1070)
      .translate([width / 2, height / 2]);


  var svg = d3.select(selector).append("svg")
               .attr("width", width)
               .attr("height", height)
  
  var map = svg.append("g")
               .attr("id", "map")

  map.append("g").attr("id", "states")
  svg.append("g").attr("id", "overlay")

  svg.append("layout-data").attr("off-map-count", 0)

  d3.json("../maps/us.json", function(error, us) {

    path = d3.geo.path().projection(projection);

    map.append("g")
      .attr("id", "states")
      .selectAll("path")
        .data(topojson.feature(us, us.objects.states).features)
      .enter().append("path")
        .attr("d", path)

    map.append("g").attr("id", "borders")
      .append("path")
      .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
      .attr("id", "state-borders")
      .attr("d", path)

    map.append("rect")
          .attr("class", "background")
          .attr("width", width)
          .attr("height", height);
  
    
    console.log("Base map loaded.")
  });
  return {svg: svg, projection: projection}
}

//Acquire all service information from the base url
//Appends the items in serviceIds onto the baseUrl to acquire the details
//After acquiring the information, builds a dictionary of {accesspoint: {lattitude: x, longitude: y}}
//Finally executes the "then" on the resulting dictionary
//
//Returns at most one result for each UNIQUE serviceID
//Drops serviceID results if incomplete
function allServiceData(services, match, then) {
  var uniqueServices = getUniqueById(services);
  var unknownLoc     = {}	
  var serviceDetails = []
  var uniqueIds = Object.keys(uniqueServices)
  for (var i =0; i < uniqueIds.length; i++) {
    var name =  uniqueIds[i]
    var item = uniqueServices[name]

    if (item.serviceType && item.serviceType != match) {
      continue;
    }

    name = getServiceName(item);

    var place = []
    if (hasLocationInfo(item)) {
      place = {longitude: item.location.longitude, latitude: item.location.latitude}
      serviceDetails.push({name: name, location: place, depot_id: item.id})
    } else {
      unknownLoc[name] = {id: item.id};
    }
  }
  
  console.log("loaded " + serviceDetails.length + " service locations")
  ipToLocation(unknownLoc, then);
  then(serviceDetails)
}

//Acquire gelocations for the item dictionary, if available
//Converts to a dictionary of {ip: {lattitude: x, longitude: y}}
function ipToLocation(items, then) {
  Object.keys(items).forEach(function(name) {
    var url = "https://freegeoip.net/json/" + name
    d3.json(url, function (error, raw) {
      var locations = []
      if (error) {
        var id = items[name] === undefined ? "unknown" : items[name].id
        locations.push({name: name, location: [], depot_id: id})
        console.log("No location found for ", name, items[name])
      } else {
          var place = []
          if (raw.longitude !== undefined
              && raw.latitude !== undefined) {
            place = {latitude: raw.latitude, longitude: raw.longitude}
          }
          var id = items[raw.ip] === undefined ? "unknown" : items[raw.ip].id
          locations.push({name: raw.ip, location: place, depot_id: id})
      }
      then(locations)
    })
  })
}



/// -------------------------------------------
//   Download visualizatoin components
function downloadStatusBar(svg, barClass, color, barOffset, barHeight) {
  var downloads = svg.select("#downloads")
  var targetLeft = parseInt(downloads.attr("target-left"))
  var targetWidth = parseInt(downloads.attr("target-width"))

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

function moveLineToProgress(svg, mapNode, barOffset, barHeight){
  var downloads = svg.select("#downloads")
  var targetLeft = parseInt(downloads.attr("target-left"))
  var targetHeight = parseInt(downloads.attr("target-height"))
  
  var end = [targetLeft, barOffset];
  var mapGroup = d3.select(mapNode.node().parentNode)
  var start = d3.transform(mapGroup.attr("transform")).translate

  var color = nodeRecolor(mapGroup)

  mapGroup.select(".eodnNode")
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
    .each("end", function(){downloadStatusBar(svg, "source-found-segment", color, barOffset, barHeight)})
    .transition().duration(500).remove();
}

// svg -- svg root to work with
// id -- Id of the source node
// progress -- Percentage of the file just read
// offset -- Percent offset of the newest chunk
function doProgressWithOffset(svg, id, progress , offsetPercent){
  //Calculate geometry of the progress bar chunk
  var downloads = svg.select("#downloads")
  var targetTop = parseInt(downloads.attr("target-top"))
  var targetLeft = parseInt(downloads.attr("target-left"))
  var targetHeight = parseInt(downloads.attr("target-height"))
  
  var ratio = targetHeight / 100 ;
  var barOffset = targetTop + (offsetPercent || 0) * ratio;
  var barHeight = ratio * progress;
  if (barHeight == 0 || isNaN(barHeight)) {barHeight=.1}

  //Find the source location node
  var nodes = svg.selectAll(".eodnLocation").filter(function(d) {return this.getAttribute("depot_ip") == id})
  if (nodes.empty()) {
    console.log("DownloadProgress: Node not found " + id)
    downloadStatusBar(svg, "source-not-found-segment", "#222222", barOffset, barHeight)
    return;}

  var mapNode = d3.select(nodes[0][0]) //ensures we have exactly one item as the source
  moveLineToProgress(svg, mapNode, barOffset, barHeight);
}

//TODO: Extend this with an ID when you add multiple files, thread that ID through progress
//      Either move all this to the layout-params group or push file-specific values into the rect
function initProgressTarget(svg, width, height) {
  var left = svg.attr("width")-width
  var top = svg.attr("height")/2 - height/2

  var g = svg.append("g")
            .attr("id", "downloads")
            .attr("target-width", width)
            .attr("target-height", height)
            .attr("target-top", top)
            .attr("target-left", left)
            .attr("progress-start", 0)

  g.append("rect")
      .attr("id", "download-target")
      .attr("transform", "translate(" + left + "," + top + ")")
      .attr("fill", "#bbb")
      .attr("width", width)
      .attr("height", height)
}
