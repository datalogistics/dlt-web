// Add a highlight halo to a specified map item(s).
// 
// svg -- Root svg element to find things in
// selector -- An svg selector for items.  
// filter -- A predicate run on selected items
function highlightMapLocations(svg, selector, filter, retries) {
  if (typeof filter == 'undefined') {filter = function(d,i) {return true;}}
 
  var items = svg.selectAll(selector).filter(filter)

  if (items.empty()) {
    if (typeof retries == 'undefined') {retries = 20;}
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
            .attr("stroke", "#700039")
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
function tooltip(svg, text) {
  tip = d3.tip().attr('class', 'd3-tip').html(function() {
    var x = d3.select(this);
    return x.attr('name');						
  })

  svg.call(tip);
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
function addMapLocation(projection, name, lonLat, svg, depot_id) {		
  var node = svg.append("g")
      .attr("transform", function() {return "translate(" + projection(lonLat) + ")";})

  var circ = node.append("circle")
      .attr("r",5)
      .attr('fill',"#CA7173")
      .attr('stroke',"#860003")
      .attr('class', "eodnNode")
      .attr('name', name)
      .attr('location', lonLat)

  if (typeof depot_id != 'undefined') {circ.attr('depot_id', depot_id)}

  //nodeLocationMap[name] = node ;
  return node ;
}				


//Add nodes to the side of the map, because their lat/lon is not known
//baseLataLon tells where to put the first off map location.  Others are placed in a line down from there.
function addOffMapLocation(projection, idx, baseLatLon, name, svg, depot_id) {
    pair = [baseLatLon[0]-idx*.3, baseLatLon[1]-idx]  //the idx*.3 straigthens out the line
    node = addMapLocation(projection, name, pair, svg, depot_id)
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
    })
    tooltip(svg)
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
  var uniqueServices = {};

  for(var i = 0; i < services.length; i++) {
    if(uniqueServices[services[i].id] != 'undefined') {
	uniqueServices[services[i].id] = services[i];
    }
  }

  var unknownLoc     = {}	
  var serviceDetails = []
  var uniqueIds = Object.keys(uniqueServices)
  for (var i =0; i < uniqueIds.length; i++) {
    var name =  uniqueIds[i]
    var item = uniqueServices[name]
    if (typeof item.accessPoint != 'undefined') {
     name = ((item.accessPoint || "").split("://")[1] || "").split(":")[0] || "" 
    } else if (typeof item.name != 'undefined') {
      name = item.name
    }

    var place = []
    if (typeof item.location != 'undefined'
      && typeof item.location.longitude != 'undefined'
      && typeof item.location.latitude != 'undefined'
      && item.location.longitude != 0
      && item.location.latitude != 0) {
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
  var q = queue()
    Object.keys(items).forEach(function(name) {
      var url = "http://freegeoip.net/json/" + name
      q.defer(d3.json, url)
    })

  q.awaitAll(function(error, result) {
    var locations = []
      console.log(result);
    result.forEach(function(raw) {
      place = []
      if (typeof raw.longitude != 'undefined'
          && typeof raw.latitude != 'undefined') {
          place = {latitude: raw.latitude, longitude: raw.longitude}
      }
	locations.push({name: raw.ip, location: place, depot_id: items[raw.ip].id})
    })
    console.log("loaded " + result.length + " ip locations")
    then(locations)
  })
}


