function allServiceData(baseUrl, serviceIds) {
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
      services.push({
        name: raw.location.institution, 
        id: raw.id,
        location: raw.location, 
        status: raw.status
      })
    })
  return services
  })
}

function baseMap(selector, width, height) {
  d3.json("../maps/us.json", function(error, us) {
    var svg = d3.select(selector).append("svg")
        .attr("width", width)
        .attr("height", height)

    projection = d3.geo.albersUsa()
      .scale(1070)
      .translate([width / 2, height / 2]);

    path = d3.geo.path().projection(projection);

    svg.append("g")
        .attr("id", "states")
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
        });
}

