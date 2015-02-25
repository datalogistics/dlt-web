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
      console.log("Trying again")
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
function addMapLocation(projection, name, rawLonLat, svg, depot_id, depot_ip) {		
  var lonLat = [rawLonLat[0].toFixed(2), rawLonLat[1].toFixed(2)] //Round lat/lon

  var translate = "translate(" + projection(lonLat) + ")"
  var nodes = svg.selectAll(".eodnLocation").filter(function (d, i) { return d3.select(this).attr("transform") == translate })

  if (nodes.empty()) {
    var node = svg.append("g")
        .attr("transform", function() {return translate;})
        .attr("class", "eodnLocation")

    var circ = node.append("circle")
        .attr("r",7)
        .attr('fill',"#B4635F")
        .attr('stroke',"#76231F")
        .attr('stroke-width', '1.25')
        .attr('class', "eodnNode")
        .attr('name', name)
        .attr('location', lonLat)

    if (depot_id !== undefined) {circ.attr('depot_id', depot_id)}
    if (depot_ip !== undefined) {circ.attr('depot_ip', depot_ip)}

    //nodeLocationMap[name] = node ;
    return node
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
     
      //Empty point to search for by name...
      var circ = group.append("circle")
         .attr("r", 1)
         .attr("class", "eodnNode")
         .attr("name", name)
         .attr("style", "display:none")
         .attr("depot-ip", name)

      if (depot_id !== undefined) {circ.attr('depot_id', depot_id)}
      if (depot_ip !== undefined) {circ.attr('depot_ip', depot_ip)}
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
    return node
}


//Map a collection of places.  The places should be a list of dictionaries {name, location}.
//Location should be either {latitude, longitude} or []
//If location is [], then the item is placed off map with a printed label
function mapPoints(projection, svg, elementId) {
  return function(points) {
    var svg_points = svg.select("#overlay").append("g")
      .attr("id", elementId)

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
function allServiceData(services, then) {
  var uniqueServices = getUniqueById(services);
  var unknownLoc     = {}	
  var serviceDetails = []
  var uniqueIds = Object.keys(uniqueServices)
  for (var i =0; i < uniqueIds.length; i++) {
    var name =  uniqueIds[i]
    var item = uniqueServices[name]
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


function moveLineToProgress(svg, mapNode, progress, offsetPercent){
  // draw bar
  var downloads = svg.select("#downloads")
  var targetLeft = parseInt(downloads.attr("target-left"))
  var targetWidth = parseInt(downloads.attr("width"))
  var targetTop = parseInt(downloads.attr("target-top"))

  var progressStart = 0 //TODO: store somewhere...in map probably (like the offMapLocation counter)
  if (progressStart >= 100) {return;}
  if(progressStart + progress >= 100){
    progress = 100 - progressStart ;
  }
  if (progress >= 100) {return;}

  var ratio = 300 / 100 ;
  var progOffset = targetTop + (offsetPercent || 0) * ratio ;


  var end = [targetLeft, progOffset];
  var h = ratio * progress , w = 30 ;
  var start = d3.transform(d3.select(mapNode.node().parentNode).attr("transform")).translate
  var color = mapNode.attr("fill")

  svg.append('line')
    .style({stroke: color , strokeWidth:2})
    .attr('x1',start[0])
    .attr('y1',start[1])
    .attr('x2',start[0])
    .attr('y2',start[1])
    .transition().duration(500)
       .attr('x2',end[0])
       .attr('y2', end[1])
    .each("end", function(){						
      svg.append('rect')
      .attr("class", "download-part")
      .attr("fill", color)
      .attr("width", w)
      .attr("height", h)
      .attr('x', targetLeft)
      .attr('y', progOffset);
    //progressStart += progress;
    }).transition().duration(500).remove();
}

function doProgressWithOffset(svg, id, progress , offset){
  var nodes = svg.selectAll(".eodnNode").filter(function(d) {return this.getAttribute("name") == id})
  if (nodes.empty()) {return;}
  var mapNode = d3.select(nodes[0][0]) //ensures we have exactly one item
  moveLineToProgress(svg, mapNode, progress, offset);
}

//TODO: Extend this with an ID when you add multiple files, thread that ID through progress
//      Either move all this to the layout-params group or push file-specific values into the rect
function initProgressTarget(svg, width, height) {
  var left = svg.attr("width")-width
  var top = svg.attr("height")/2 - height/2

  var g = svg.append("g")
            .attr("id", "downloads")
            .attr("width", width)
            .attr("height", height)
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
