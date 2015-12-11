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

    if (exnode) {
      var extents = []
      
      if (exnode.extents) {
        extents = exnode.extents.map(function(e) {return {id: e.id, offset: e.offset, size: e.size, depot: parseLocation(e.mapping.read)}})
                                    .map(function(e) {e["xy"] = mapLocation(map, e.depot); return e})
                                    .sort((a,b) => a.depot.localeCompare(b.depot)) 
      } else {
        extents = [{id: exnode.id, offset: exnode.offset, size: exnode.size, depot: parseLocation(e.mapping.read)}]
      }
      
      var fill = d3.scale.category10()
      spokeExtents(map, exnode.size, extents, fill)
      gridmap(map, exnode, extents, fill)
    } else {
      map.svg.append("text")
          .attr("fill", "red")
          .attr("transform", "translate(300,10)")
          .text("Error: Exnode not found or is empty")
    }
  }


  function spokeExtents(svg, rootSize, extents, fill) {
    //TODO: Different spoke lengths for different depots in one location and layer? 
  
    var unique_depot_by_location = extents.reduce(function(acc, e) {
      var prior = acc[e.xy] || new Set()
      prior.add(e.depot)
      acc[e.xy] = prior
      return acc
    }, {})


    var max_colocated = 0;
    Object.keys(unique_depot_by_location).forEach(function(k) {
      var depots = Array.from(unique_depot_by_location[k])
      depots.sort()
      unique_depot_by_location[k] = depots
      max_colocated = Math.max(max_colocated, depots.length)
    })


    extents = extents.map(e => {e.order = (unique_depot_by_location[e.xy].indexOf(e.depot)); return e;})
    extents.sort((a,b) => b.order - a.order)
    
    var radius = d3.scale.linear()
                   .domain(range(0, max_colocated+1))
                   .range(range(0, max_colocated+1).map(i => 12+i*4))

    var arc = d3.svg.arc()
         .innerRadius("1")
         .outerRadius(d => radius(d.order))
         .startAngle(d => ((d.offset/rootSize)*(2*Math.PI)))
         .endAngle(d => {
           return Math.max(.05, ((d.offset+d.size)/rootSize))*(2*Math.PI)
         })

    var root = map.svg.insert("g", "#overlay").attr("id", "spokes")
    root.selectAll("extent").data(extents)
      .enter()
        .append("path")
        .attr("id", d => "s" +d.id)
        .attr("order", d => unique_depot_by_location[d.xy].indexOf(d.depot))
        .attr("d", arc)
        .attr("fill", (d,i) => fill(d.depot))
        .attr("transform", d => "translate(" + d.xy[0] + "," + d.xy[1] + ")")
  }

  function gridmap(map, exnode, extents, fill) {
    //TODO: Do a "regularization" pass where if an item is in cell[n] and cell[n+1], then its order number is the same in both or 0 in the 2nd if case its the only thing in that cell
    var width = 900
    var height = 250 
    var x_position = 100
    var y_position = 550

    var grid_width = 100 //Number of cells horizontally
    var grid_height= 5   //Number of rows

    var cell_width_pad = .5    //Distance between adjacent cells
    var cell_height_pad = 10  //Distance between rows
    var overlay_height = 5    //Height of duplicate indicator bands
    

    var root = map.svg.append("g").attr("id", "gridmap").attr("transform","translate(" + x_position + ", " + y_position + ")")

    root.append("rect")
        .attr("id", "grid-background")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "#FFF")
    
        
    var cells = range(0, grid_width*grid_height).map(function(e) {return {depots:new Set(), exnodes:[]}})

    extents.forEach(function(e) {
      var lowCell = Math.min(Math.ceil((e.offset/exnode.size)*cells.length), cells.length)
      var highCell = Math.min(Math.ceil(((e.offset+e.size)/exnode.size)*cells.length), cells.length)
      range(lowCell, highCell).forEach(function(cell) {
        cells[cell].exnodes.push(e.id)
        cells[cell].depots.add(e.depot)
      })
    })

    cells.forEach(e => {e.depots = Array.from(e.depots); e.depots.sort()}) //Ensure unique depot ids and cannonical order

    var flattened = cells.reduce(function(acc, cell, cell_idx) {
      var flat = cell.depots.map((d,i) => {return {depot: d, cell_idx: cell_idx, order: i, overlaps: cell.exnodes}})
      acc = acc.concat(flat)
      return acc
    }, [])
    
    var sections = root.selectAll(".section").data(flattened.filter(d => d.order == 0))
      .enter().append("rect")
        .attr("class", "section")
        .attr("exnodes", d => d.overlaps)
        .attr("x", d => (d.cell_idx%grid_width)*(width/grid_width))
        .attr("y", d => Math.floor(d.cell_idx/grid_width)*(height/grid_height))
        .attr("width", (width/grid_width)-cell_width_pad)
        .attr("height", (height/grid_height)-cell_height_pad)
        .attr("fill", (d,i) => fill(d.depot))
        .on("mouseover", function() {
          var exnodes = d3.select(this).attr("exnodes").split(",")
          exnodes.forEach(function(ex) {
            var spoke = d3.select("#s" + ex)
            spoke.attr("restore", spoke.attr("transform"))
            spoke.attr("transform", spoke.attr("transform") + "scale(2.2)")
          })
        })
        .on("mouseout", function() {
          var exnodes = d3.select(this).attr("exnodes").split(",")
          exnodes.forEach(function(ex) {
            var spoke = d3.select("#s" + ex)
            spoke.attr("transform", spoke.attr("restore"))
          })
        })

    var sections = root.selectAll(".subsection").data(flattened.filter(d => d.order < 5 && d.order > 0))
      .enter().append("rect")
        .attr("class", "section")
        .attr("x", d => (d.cell_idx%grid_width)*(width/grid_width))
        .attr("y", d => Math.floor(d.cell_idx/grid_width)*(height/grid_height)+(d.order-1)*overlay_height)
        .attr("width", (width/grid_width)-cell_width_pad)
        .attr("height", overlay_height)
        .attr("fill", (d,i) => fill(d.depot))

    exnodeStats(map, exnode, cells, width + x_position + 20, y_position+30)
    legend(map, exnode, extents, fill, width + x_position + 20, y_position+125)
  }

  function exnodeStats(map, exnode, cells, x_position, y_position) {
    var max = cells.reduce((acc, cell) => Math.max(acc, cell.depots.length), 0)
    var min = cells.reduce((acc, cell) => Math.min(acc, cell.depots.length), 1000000)
    var sum = cells.reduce((acc, cell) => acc + cell.depots.length, 0)
    var avg = sum/cells.length
    var uniques = cells.reduce((acc, cell) => {cell.depots.forEach(e => acc.add(e)); return acc;}, new Set())
    uniques = Array.from(uniques)
    
    var data = [["Exnode ID", exnode.id], 
                ["Min,Avg,Max duplication", [min, avg, max]],
                ["Unique Depots", uniques.length]]

    var root = map.svg.append("g")
        .attr("id", "stats")
          .attr("transform", "translate(" + x_position + ", " + y_position + ")")

    root.selectAll("text").data(data)
       .enter().append("text")
          .attr("x", 0)
          .attr("y", (d,i) => i*15)
          .text((d) => d[0] + ": " + d[1])
   
    root.append("text")
       .attr("id", "stats_label")
       .attr("class", "section_header")
       .attr("x", 0)
       .attr("y", -15)
       .style("font-size", "125%")
       .text(exnode.name)
  }

  function legend(map, exnode, extents, fill, x_position, y_position) {
    var data = fill.domain()
    var size = 10
    var spacing = 15
    var text_offset=10

    var percents = extents.reduce(function(acc, e) {
      var total = acc[e.depot] || 0
      total = total + e.size
      acc[e.depot] = total
      return acc
    }, {})

    var root = map.svg.append("g")
          .attr("id", "grid_legend")
          .attr("transform", "translate(" + x_position + ", " + y_position + ")")

    root.selectAll("rect").data(data)
       .enter().append("rect")
          .attr("x", 0)
          .attr("y", (d,i) => i*spacing)
          .attr("height", size) 
          .attr("width" , size) 
          .attr("fill", fill)

    root.selectAll("text").data(data)
      .enter().append("text")
         .attr("x", spacing)
         .attr("y", (d,i) => i*spacing+text_offset)
         .style("white-space", "pre")
         .text(d => d + "  (" + (percents[d]/exnode.size*100).toFixed(1) + "%)")
    
   root.append("text")
       .attr("id", "legend_label")
       .attr("x", 0)
       .attr("y", -10)
       .style("font-size", "125%")
       .text("Depot (% of file)")
  }

  function parseLocation(mapping) {return mapping.split("/")[2]}
  function range(low, high) {return Array.apply(null, Array((high-low))).map((_,i) => low+i)}
  function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
    }
    return copy;
  }
} 


