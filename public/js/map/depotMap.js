//Find where a location is on the map (pixel coordinates)
//Adds items to the map if not found then returns the new location
function mapLocation(map, entry) {
  var name = undefined
  if (entry.host) {
    name = entry.host
  } else {
    name = entry.split(":")[0]
  }

  var selector = ".depotLocation[name='" + name + "']"
  var node = map.svg.selectAll(selector).node()
  if (node == null) {
    console.error("Could not find map location: " + name)
    mapPoints(map.projection, map.svg)([{location: [], name: name, port: "", depot_id: "GENERATED_ID" + Math.random()}])
    return mapLocation(map, name)
  }
  var parent = d3.select(node.parentNode)
  return d3.transform(parent.attr("transform")).translate
}

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
      console.error("Retry highlight")
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
                return x.attr('name').replace(/\|/g,"</p>")
              })

    svg.call(tip);
  }

  var timer;
  svg.selectAll("circle.depotNode").on('mouseover', function(){
      clearTimeout(timer);
      tip.show.apply(this,arguments);
  })
  .on('mouseout', function(){
    timer = setTimeout(tip.hide,2000);
  });
}


//Add a node with name at position latLon to svg using the projection
//TODO: Refactor so the invisible point is always added, reduce duplciate code
function addMapLocation(projection, name, port, rawLonLat, svg, depot_id) {		
  var lonLat = [rawLonLat[0].toFixed(1), rawLonLat[1].toFixed(1)] //Round lat/lon
  
  var translate = "translate(" + projection(lonLat) + ")"
  var nodes = svg.selectAll(".depotGroup").filter(function (d, i) { return d3.select(this).attr("transform") == translate })
  
  //Function to add an invisible point to each location
  var invisiblePoint = function(parentGroup) {
    var circ = parentGroup.append("circle")
      .attr("r", 1)
      .attr("class", "depotLocation")
      .attr("name", name)
      .attr("port", port)
      .attr("style", "display:none")
    
    if (depot_id !== undefined) {circ.attr('depot_id', depot_id)}
  }
  
  if (nodes.empty()) {
    var group = svg.append("g")
      .attr("transform", translate)
      .attr("class", "depotGroup")
    
    var circ = group.append("circle")
      .attr("r",7)
      .attr('fill',"#B4635F")
      .attr('stroke',"#76231F")
      .attr('stroke-width', '1.25')
      .attr('class', "depotNode")
      .attr('name', name + ":" + port)
      .attr('location', lonLat)
    
    invisiblePoint(group)
  } else {
    nodes.each(function(d,i) {
      var group = d3.select(this)
      var count = group.select(".count")
      if (count.empty()) {
        group.append("text")
          .text("2")
          .attr("class", "count")
          .attr("baseline-shift", "-4.5px")
          .attr("text-anchor", "middle")
          .attr("fill", "#D99490")
      } else{
        var val = parseInt(count.text())
        val = val + 1;
        count.text(function (d) {return val})
      }
      
      var super_circ = group.select(".depotNode")
      var existingName = super_circ.attr("name")
      super_circ.attr("name", name + ":" + port + "|" + existingName)
      invisiblePoint(group)
    });
  }
  return group
}


//Add nodes to the side of the map, because their lat/lon is not known
//baseLataLon tells where to put the first off map location.  Others are placed in a line down from there.
function addOffMapLocation(projection, idx, baseLatLon, name, port, svg, depot_id) {
    pair = [baseLatLon[0]-idx*.3, baseLatLon[1]-idx]  //the idx*.3 straigthens out the line
    node = addMapLocation(projection, name, port, pair, svg, depot_id)
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
        addOffMapLocation(projection, offmap, [-72, 40], item.name, item.port, svg_points, item.depot_id)
      } else {
        pair = [item.location.longitude, item.location.latitude]
        node = addMapLocation(projection, item.name, item.port, pair, svg_points, item.depot_id)
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
function baseMap(selector, width, height, svg) {
  projection = d3.geo.albersUsa()
      .scale(1070)
      .translate([width / 2, height / 2]);


  if (svg === undefined) {
    svg = d3.select(selector).append("svg")
               .attr("width", width)
               .attr("height", height)
  }
  
  var map = svg.append("g")
               .attr("id", "map")
               .attr("width", width)
               .attr("height", height)

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
function allServiceData(services, match, natmap, then) {
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

    port = 6714;
    name = getServiceName(item);
    if (natmap && name in natmap) {
      port = natmap[name].port || port
      name = natmap[name].external || name
    }

    var place = []
    if (hasLocationInfo(item)) {
      place = {longitude: item.location.longitude, latitude: item.location.latitude}
      serviceDetails.push({name: name, location: place, depot_id: item.id, port: port})
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
    var url = DLT_PROPS.FreeGeoIpUrl + name
    d3.json(url, function (error, raw) {
      var locations = []
      if (error) {
        var id = items[name] === undefined ? "unknown" : items[name].id
        locations.push({name: name, location: [], depot_id: id})
        console.error("No location found for ", name, items[name])
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

function backplaneLinks(map, natmap) {
  d3.json("./api/linkmap", function(link_map) {
    var overlay = map.svg.insert("g", "#overlay").attr("name", "network")
    for (key in link_map) {
      var link = link_map[key]
      add_link(overlay, map, natmap, link)
    }

    //HACK: There are better ways to do this..
    var legend = overlay.append("g").attr("class", "legend").attr("transform","translate(30, 10)")

    legend.append("text").text("Link Types")
    legendEntry(legend, "ion", 0, 10)
    legendEntry(legend, "al2s", 0, 25)
  })
  
  function legendEntry(svg, label, x, y) {
    svg = svg.append("g").attr("transform", "translate(" + x + "," + y + ")")

    svg.append("line")
       .attr("x1", 0)
       .attr("y1", 0)
       .attr("x2", 15)
       .attr("y2", 0)
       .attr("stroke", link_color(label))
       .attr("stroke-width", 3)

    svg.append("text")
       .attr("x", 20)
       .attr("y", 4)
       .attr("text-anchor", "left")
       .text(label)

  }

  function add_link(overlay, map, natmap, link) {
    var a = screen_location(map.svg, natmap, link.endpoint_a)
    var z = screen_location(map.svg, natmap, link.endpoint_z)

    if (a === undefined | z === undefined) {return;}

    overlay.append("path")
      .attr("d", link_arc(a, z))
      .attr("stroke-width", (link.capacity/100000)+.5)
      .attr("fill", "none")
      .attr("stroke", link_color(link.type))
      .attr("class", "geni_link")
  }

  function link_color(type) {
    if (type == "ion") {
	return "#494F7C"
//	return "#102D46"
    } else if (type == "al2s") {
	return "#4A8C52"
//	return "#5A788E"
    } else {
	return "#AA8739"
//	return "#6E5D5C"
    }
  }

  //from: http://bl.ocks.org/mbostock/1153292
  function link_arc(source, target) {
    var dx = target[0] - source[0],
        dy = target[1] - source[1],
        dr = Math.sqrt(dx * dx + dy * dy);
    return "M" + source[0] + "," + source[1] + "A" + dr + "," + dr + " 0 0,1 " + target[0] + "," + target[1];
  }

  function screen_location(svg, natmap, endpoint) {
    var mapping = natmap[endpoint]
    if (mapping) {
      endpoint = mapping.external
      port = mapping.port
    }
    else {
      port = 6714
    }

    var mapNode = svg.selectAll(".depotLocation").filter(function(d) {
      return ((this.getAttribute("name") == endpoint) &&
	      (this.getAttribute("port") == port))
    })
    
    if (mapNode.empty()) {
      console.error("link endpoint not in depot map: ", endpoint, port)
      return undefined;
    }

    var mapGroup = d3.select(mapNode.node().parentNode)
    return d3.transform(mapGroup.attr("transform")).translate
  }
}
