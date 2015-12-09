function exnodeMapController($scope, $location, $http, UnisService, SocketService) {
  var svg = d3.select("#exnodeMap").append("svg")
               .attr("width", 1200)
               .attr("height", 900)

  var map = baseMap("#exnodeMap", 960, 500, svg);
  var nodeId = $location.path().split("/")[2]

  $scope.services = UnisService.services
  $http.get('/api/natmap')
    .then(function(res) {
      var natmap = res.data;
      allServiceData($scope.services, "ibp_server", natmap,
        mapPoints(map.projection, map.svg, "depots"));
      return natmap
    })
    .then(function(natmap) {backplaneLinks(map, natmap)})
    .then(() => $http.get('/api/exnodes/?id=' + nodeId))
    .then(res => displayExnode(map, nodeId, res.data[0])) 
  
  $scope.$on("$destroy", function() {
    d3.selectAll("#map-tool-tip").each(function() {this.remove()})  //Cleans up the tooltip object when you navigate away
  })


  function displayExnode(map, nodeId, exnode) {
    var extents = exnode.extents
    
    spokeExtents(map, exnode.size, extents)
    gridmap(map, exnode.size, extents)
  }

  function spokeExtents(svg, rootSize, extents) {
    var located = extents.map(function(e) {return {id: e.id, offset: e.offset, size: e.size, depot: parseLocation(e.mapping.read)}})
                         .map(function(e) {e["xy"] = mapLocation(map, e.depot); return e})

    var arc = d3.svg.arc()
         .innerRadius("1")
         .outerRadius("15")
         .startAngle(d => ((d.offset/rootSize)*2*Math.PI))
         .endAngle(d => Math.max(1, Math.round((d.offset+d.size)/rootSize)*2*Math.PI))


    console.log(uniques(located.map(e => e.depot)))

    var root = map.svg.insert("g", "#overlay").attr("id", "spokes")
    var fill = d3.scale.category20b()
    root.selectAll("extent").data(located)
      .enter()
        .append("path")
        .attr("id", d => d.id)
        .attr("d", arc)
        .attr("fill", (d,i) => fill(d.depot))
        .attr("transform", d => "translate(" + d.xy[0] + "," + d.xy[1] + ")")
  }

  function gridmap(map, rootSize, extents) {
    var width = 900
    var height = 200

    var root = map.svg.append("g").attr("id", "#gridmap").attr("transform","translate(100,550)")

    root.append("rect")
        .attr("id", "grid-background")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "#DDD")

    var cells = range(0, 1000).map(e => [])

    extents.forEach(function(e) {
      var lowCell = Math.floor((e.offset/rootSize)*cells.length)
      var highCell = Math.max(Math.ceil(((e.offset+e.size)/rootSize)*cells.length), cells.length-1)
      range(lowCell, highCell).forEach(cell => {cells[cell].push(e.id)})
    })

    console.log(cells)
    console.log(cells.map(e => e.length))
    console.log("Max overlap", cells.reduce((acc, e) => Math.max(acc, e.length)))

    var grid_width = 100
    var grid_height= Math.ceil(cells.length/grid_width)

    var fill = d3.scale.category20()
    //var fill = d3.scale.quantize()
    //  .domain((0, Math.max(cells.map(e => e.length))))
    //  .range(colorbrewer.Reds[numColors]);

    root.selectAll("extent").data(cells)
      .enter().append("rect")
        .attr("class", "grid extent")
        .attr("data", d => d)
        .attr("x", (d,i) => (i%grid_width)*(width/grid_width))
        .attr("y", (d,i) => Math.floor(i/grid_width)*(height/grid_height))
        .attr("width", (width/grid_width)-1)
        .attr("height", (height/grid_height)-1)
        .attr("fill", (d,i) => fill(d[0]))

    root.selectAll("labels").data(cells)
      .enter().append("text")
        .attr("x", (d,i) => 1+(i%grid_width)*(width/grid_width))
        .attr("y", (d,i) => ((height/grid_height)*.8)+Math.floor(i/grid_width)*(height/grid_height))
        //.attr("fill", "#BBB")
        .text(d => d.length > 9 ? "+" : d.length)

  }

  function parseLocation(mapping) {return mapping.split("/")[2]}
  function range(low, high) {return Array.apply(null, Array((high-low))).map((_,i) => low+i)}
  function uniques(array) {
    var unique = new Set()
    array.forEach(e => unique.add(e))
    return unique
  }
} 


