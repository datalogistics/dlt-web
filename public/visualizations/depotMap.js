//Acquire all service information from the base url
//Appends the items in serviceIds onto the baseUrl to acquire the details
//Returns when all serviceId queries have returned (either with values or timeout)
//Returns at most one result for each UNIQUE serviceID
//Drops serviceID results if incomplete
//TODO: Do a better job of filling in defaults on incomplete results.
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
    console.log("Queue done.")
    var services = []
    result.forEach(function(raw) {
      if (typeof raw.location != 'undefined'
        && typeof raw.location.institution != 'undefined'
        && typeof raw.status != 'undefined') {
            services.push({
              name: raw.location.institution, 
              id: raw.id,
              location: raw.location, 
              status: raw.status
            })
        }
    })
    then(services)
  })
}

//Add a node with name at position latLon to svg using the projection
function addLocation(name, lonLat, svg, projection) {		
  //var color = svg.getRandomColor();					
  var node = svg.append("circle")
    .attr("r",5)
    .attr('fill',"#ee2222")
    .attr('color',"#ee2222")
    .attr('class',name + " eodnNode")
    .attr('name',name)
    .attr('location', lonLat)
    .attr("transform", function() {return "translate(" + projection(lonLat) + ")";});
  //nodeLocationMap[name] = node ;
  return  node ;
}				

function mapPoints(svg, projection, elementId) {
  return function(points) {
    var svg_points = svg.select("#overlay").append("g")
      .attr("id", elementId)

    points.forEach(function(item) {
      pair = [item.location.longitude, item.location.latitude]
      addLocation(item.name, pair, svg_points, projection)
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
        .attr("id", "map")
        .attr("width", width)
        .attr("height", height)

  svg.append("g").attr("id", "states")
  svg.append("g").attr("id", "overlay")

  d3.json("./maps/us.json", function(error, us) {

    path = d3.geo.path().projection(projection);

    svg.select("#states")
      .selectAll("path")
        .data(topojson.feature(us, us.objects.states).features)
      .enter().append("path")
        .attr("d", path)

    svg.append("path")
      .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
      .attr("id", "state-borders")
      .attr("d", path)

    svg.append("rect")
          .attr("class", "background")
          .attr("width", width)
          .attr("height", height);
    console.log("Base map loaded.")
  });
  return {svg: svg, projection: projection}
}

