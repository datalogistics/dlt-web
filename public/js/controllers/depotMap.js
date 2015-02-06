// Add a highlight halo to a specified map item(s).
// 
// svg -- Root svg element to find things in
// selector -- An svg selector for items.  
// filter -- A predicate run on selected items
function highlightMapLocations(svg, selector, filter) {
  if (typeof filter == 'undefined') {filter = function(d,i) {return true;}}
 
  var items = svg.selectAll(selector).filter(filter)

  if (items.empty()) {
    console.log("Trying again")
    setTimeout(function() {highlightMapLocations(svg, selector, filter)}, 1000)
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

//Add a node with name at position latLon to svg using the projection
function addMapLocation(projection, name, lonLat, svg) {		
  //var color = svg.getRandomColor();					
  var node = svg.append("g")
      .attr("transform", function() {return "translate(" + projection(lonLat) + ")";})

      var circ = node.append("circle")
        .attr("r",5)
        .attr('fill',"#CA7173")
        .attr('stroke',"#860003")
        .attr('class', "eodnNode")
        .attr('name', name)
        .attr('location', lonLat)

  //nodeLocationMap[name] = node ;
  return node ;
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
        console.log("hello")
      clearTimeout(timer);
      tip.show.apply(this,arguments);
  })
  .on('mouseout', function(){
    timer = setTimeout(tip.hide,2000);
  });
}

//Add nodes to the side of the map, because their lat/lon is not known
//baseLataLon tells where to put the first off map location.  Others are placed in a line down from there.
//TODO: Should projection be used...or not?
function addOffMapLocation(projection, idx, baseLatLon, name, svg) {
    pair = [baseLatLon[0], baseLatLon[1]-idx]
    node = addMapLocation(projection, name, pair, svg)
    node.append("text")
       .attr("dx", function(d){return 10})
       .attr("dy", function(d){return 4})
       .text(function(d) {return name})
    return node
}


//Map a collection of places.  The places should be a list of dictionaries {name, location}.
//Location should be either {latitude, longitude} or []
//If location is [], then the item is placed off map with a printed label
var offmap =  0  //variable is global in case unkowns come from multiple sources
function mapPoints(projection, svg, elementId) {
  return function(points) {
    var svg_points = svg.select("#overlay").append("g")
      .attr("id", elementId)

    points.forEach(function(item) {
      if (item.location.length == 0
         || item.location.latitude == undefined
         || item.location.longitude == undefined) {
        addOffMapLocation(projection, offmap, [-72, 40], item.name, svg_points)
        offmap = offmap+1
      } else {
        pair = [item.location.longitude, item.location.latitude]
        node = addMapLocation(projection, item.name, pair, svg_points)
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
  
    svg.append("g").attr("id", "overlay")

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
function allServiceData(baseUrl, serviceIds, then) {
  var uniqueServices = [];

  for(var i = 0; i < serviceIds.length; i++) {
    if(uniqueServices.indexOf(serviceIds[i].id) == -1) {
      uniqueServices.push(serviceIds[i].id);
    }
  }

  var q = queue()
  uniqueServices.forEach(function(service) {
    var url = baseUrl + "/" + service
    q.defer(d3.json, url)
  })
	 
  q.awaitAll(function(error, result) {
    var services = []
    result.forEach(function(raw) {
      
      id = "unknown"
      if (typeof raw.accessPoint != 'undefined') {
        id = ((raw.accessPoint || "").split("://")[1] || "").split(":")[0] || "" 
      }

      place = []
      if (typeof raw.location != 'undefined'
        && typeof raw.location.longitude != 'undefined'
        && typeof raw.location.latitude != 'undefined') {
        place = {longitude: raw.location.longitude, latitude: raw.location.latitude}
      }

      services.push({name: id, location: place})
    })
    console.log("loaded " + services.length + " service locations")
    then(services)
  })
}

//Acquire gelocations for the given IP addresses, if available
//Converts to a dictionary of {ip: {lattitude: x, longitude: y}}
function ipToLocation(ips, then) {
  var q = queue()
    ips.forEach(function(ip) {
      var url = "http://freegeoip.net/json/" + ip
      q.defer(d3.json, url)
    })

  q.awaitAll(function(error, result) {
    var locations = []
    result.forEach(function(raw) {
      place = []
      if (typeof raw.longitude != 'undefined'
          && typeof raw.latitude != 'undefined') {
          place = {latitude: raw.latitude, longitude: raw.longitude}
      }
      locations.push({name: raw.ip, location: place})
    })
  console.log("loaded " + result.length + " ip locations")
    then(locations)
  })
}


