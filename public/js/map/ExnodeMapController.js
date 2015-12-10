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
    if (exnode && exnode.extents) {
      var extents = exnode.extents.map(function(e) {return {id: e.id, offset: e.offset, size: e.size, depot: parseLocation(e.mapping.read)}})
                                  .map(function(e) {e["xy"] = mapLocation(map, e.depot); return e})

      var fill = d3.scale.category10()
      spokeExtents(map, exnode.size, extents, fill)
      gridmap(map, exnode.size, extents, fill)
    } else {
      map.svg.append("text")
          .attr("fill", "red")
          .attr("transform", "translate(300,10)")
          .text("Error: Exnode not found or no extents found in exnode")
    }
  }

  function spokeExtents(svg, rootSize, extents, fill) {
    //TODO: Different spoke lengths for different depots in one location and layer? 
    var arc = d3.svg.arc()
         .innerRadius("1")
         .outerRadius("15")
         .startAngle(d => ((d.offset/rootSize)*2*Math.PI))
         .endAngle(d => Math.max(.5, Math.round((d.offset+d.size)/rootSize)*2*Math.PI))

    var root = map.svg.insert("g", "#overlay").attr("id", "spokes")
    root.selectAll("extent").data(extents)
      .enter()
        .append("path")
        .attr("id", d => d.id)
        .attr("d", arc)
        .attr("fill", (d,i) => fill(d.depot))
        .attr("transform", d => "translate(" + d.xy[0] + "," + d.xy[1] + ")")
  }

  function gridmap(map, rootSize, extents, fill) {
    var width = 900
    var height = 200

    var root = map.svg.append("g").attr("id", "gridmap").attr("transform","translate(100,550)")

    root.append("rect")
        .attr("id", "grid-background")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "#FFF")
    
        
    var grid_width = 100
    var grid_height= 10 
    var cells = range(0, grid_width*grid_height).map(function(e) {return {depots:new Set(), exnodes:[]}})

    extents.forEach(function(e) {
      var lowCell = Math.floor((e.offset/rootSize)*cells.length)
      var highCell = Math.min(Math.ceil(((e.offset+e.size)/rootSize)*cells.length), cells.length-1)
      range(lowCell, highCell).forEach(function(cell) {
        cells[cell].exnodes.push(e.id)
        cells[cell].depots.add(e.depot)
      })
    })

    cells.forEach(e => {e.depots = Array.from(e.depots); e.depots.sort()}) //Ensure unique depot ids and cannonical order

    var sections = root.selectAll(".section").data(cells)
      
      .enter().append("rect")
        .attr("class", "section")
        .attr("exnodes", d => d.exnodes)
        .attr("depots", d => d.depots)
        .attr("x", (d,i) => (i%grid_width)*(width/grid_width))
        .attr("y", (d,i) => Math.floor(i/grid_width)*(height/grid_height))
        .attr("width", (width/grid_width)-1)
        .attr("height", (height/grid_height)-1)
        .attr("fill", (d,i) => fill(d.depots[0]))

  }

  function parseLocation(mapping) {return mapping.split("/")[2]}
  function range(low, high) {return Array.apply(null, Array((high-low))).map((_,i) => low+i)}
  function uniques(array) {
    var unique = new Set()
    array.forEach(e => unique.add(e))
    return unique
  }
} 


