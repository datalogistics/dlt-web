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
      
      var cells = range(0, 500).map(function(e) {return {depots:new Set(), exnodes:[]}})

      extents.forEach(function(e) {
        var lowCell = Math.min(Math.ceil((e.offset/exnode.size)*cells.length), cells.length)
        var highCell = Math.min(Math.ceil(((e.offset+e.size)/exnode.size)*cells.length), cells.length)
        range(lowCell, highCell).forEach(function(cell) {
          cells[cell].exnodes.push(e.id)
          cells[cell].depots.add(e.depot)
        })
      })

      cells.forEach(e => {e.depots = Array.from(e.depots); e.depots.sort()}) //Ensure unique depot ids and cannonical order
      
      var colors = d3.scale.category20().range()
      colors = range(0, colors.length).map(i => colors[(i*2+(i>=10?1:0))%colors.length])
      var fill = d3.scale.ordinal().range(colors)
      
      spokeExtents(map, exnode.size, extents, fill)
      gridmap(map, exnode, cells, fill, 100, 550)
      exnodeStats(map, exnode, cells, 970, 100)
      legend(map, exnode, extents, fill, 970, 230)
    } else {
      map.svg.append("text")
          .attr("fill", "red")
          .attr("transform", "translate(300,10)")
          .text("Error: Exnode not found or is empty")
    }
  }


  function spokeExtents(svg, rootSize, extents, fill) {
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
                           .range(range(0, max_colocated+1).map(i => 14+i*5))

    var arc = d3.svg.arc()
         .innerRadius(d => radius(d.order-1))
         .outerRadius(d => radius(d.order))
         .startAngle(d => ((d.offset/rootSize)*(2*Math.PI)))
         .endAngle(d => {
           return Math.max(.05, ((d.offset+d.size)/rootSize))*(2*Math.PI)
         })

    var arc_highlight = d3.svg.arc()
         .innerRadius(d => radius(0))
         .outerRadius(d => radius(d.order+max_colocated+1))
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
        .attr("rest_d", arc)
        .attr("high_d", arc_highlight)
        .attr("fill", (d,i) => fill(d.depot))
        .attr("transform", d => "translate(" + d.xy[0] + "," + d.xy[1] + ")")
  }

  function gridmap(map, exnode, cells, fill, x_position, y_position) {
    var width = cells.length*2 
    var height = 50 
    var overlay_height = 5    //Height of duplicate indicator bands

    var root = map.svg.append("g").attr("id", "gridmap").attr("transform","translate(" + x_position + ", " + y_position + ")")

    root.append("rect")
        .attr("id", "grid-background")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "#FFF")

    cells = cells.map((e, i) => improveSalience(cells[Math.max(0, i-1)], e))

    var flattened = cells.reduce(function(acc, cell, cell_idx) {
      var flat = cell.depots.map((d,i) => {return {depot: d, cell_idx: cell_idx, order: i, overlaps: cell.exnodes}})
      acc = acc.concat(flat)
      return acc
    }, [])

    var segments = root.append("g").attr("id", "sections")
    segments.selectAll(".section").data(flattened.filter(d => d.order == 0))
      .enter().append("rect")
        .attr("class", "section")
        .attr("exnodes", d => d.overlaps)
        .attr("x", (d,i) => (width/cells.length)*d.cell_idx)
        .attr("y", 0)
        .attr("width", (width/cells.length))
        .attr("height", height)
        .attr("fill", (d,i) => fill(d.depot))
        .on("mouseover", function() {
          var exnodes = d3.select(this).attr("exnodes").split(",")
          exnodes.forEach(function(ex) {
            var spoke = d3.select("#s" + ex)
            spoke.attr("d", spoke.attr("high_d"))
          })
        })
        .on("mouseout", function() {
          var exnodes = d3.select(this).attr("exnodes").split(",")
          exnodes.forEach(function(ex) {
            var spoke = d3.select("#s" + ex)
            spoke.attr("d", spoke.attr("rest_d"))
          })
        })

    segments.selectAll(".subsection").data(flattened.filter(d => d.order < 5 && d.order > 0))
      .enter().append("rect")
        .attr("class", "section")
        .attr("x", (d,i) => (width/cells.length)*d.cell_idx)
        .attr("y", d => (d.order-1)*overlay_height)
        .attr("width", (width/cells.length))
        .attr("height", overlay_height)
        .attr("fill", (d,i) => fill(d.depot))

    var axisMarks = range(0, 11).map(n => (n*10)/100)
    var xaxis = root.append("g").attr("id", "x_axis").attr("transform", "translate(0," + (height+2) + ")")
    xaxis.selectAll("line").data(axisMarks)
      .enter().append("line")
        .attr("x1", (d,i) => (width/(axisMarks.length-1)) * i)
        .attr("x2", (d,i) => (width/(axisMarks.length-1)) * i)
        .attr("y1", 0)
        .attr("y2", 15)
        .attr("stroke-width", 3)
        .attr("stroke", "gray")
    
    xaxis.selectAll(".pct").data(axisMarks)
      .enter().append("text")
        .attr("class", "pct")
        .attr("x", (d,i) => (width/(axisMarks.length-1)) * i)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .text(d => (d*100).toFixed() + "%")
   
    xaxis.selectAll(".abs").data(axisMarks)
      .enter().append("text")
        .attr("class", "abs")
        .attr("x", (d,i) => (width/(axisMarks.length-1)) * i)
        .attr("y", 35)
        .attr("text-anchor", "middle")
        .text(d => formatSize(exnode.size*d))

    xaxis.append("text")
       .attr("x", 0)
       .attr("y", 55)
       .text("Average extent size: " + formatSize(mode(exnode.extents.map(e => e.size))))

  }


  function exnodeStats(map, exnode, cells, x_position, y_position) {
    var max = cells.reduce((acc, cell) => Math.max(acc, cell.depots.length), 0)
    var min = cells.reduce((acc, cell) => Math.min(acc, cell.depots.length), 1000000)
    var sum = cells.reduce((acc, cell) => acc + cell.depots.length, 0)
    var avg = sum/cells.length
    var uniques = cells.reduce((acc, cell) => {cell.depots.forEach(e => acc.add(e)); return acc;}, new Set())
    uniques = Array.from(uniques)
    
    var data = [["Root Exnode", exnode.id], 
                ["File Size", formatSize(exnode.size)],
                ["Avg Extent Size (mode)", formatSize(mode(exnode.extents.map(e => e.size)))],
                ["Child Extents", exnode.extents.length || 1],
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
          .attr("id", "legend")
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

  function swap(array, idx1, idx2) {
      var temp = array[idx1]
      array[idx1] = array[idx2]
      array[idx2] = temp
  }

  function improveSalience(left, middle) {
    //Returns a new version of middle that is ordered to match left 
    var l = left.depots
    var m = middle.depots.map(e=>e)

    for (var i=0; i<m.length; i++) {
      var idx = l.indexOf(m[i])
      if (idx > 0 && idx != i) {swap(m, idx, i)}
    }
    middle.depots = m
    return middle 
  }



  function parseLocation(mapping) {return mapping.split("/")[2]}
  function range(low, high) {return Array.apply(null, Array((high-low))).map((_,i) => low+i)}
  function formatSize(size) {
    var magnitude = Math.floor(Math.log(size)/Math.log(1024))
    var suffix = " bytes"

    if (magnitude == 1) {
      suffix = " KB"
      size = size/1024
    } else if (magnitude == 2) {
      suffix = " MB"
      size = size/Math.pow(1024,2)
    } else if (magnitude > 2) {
      suffix = " GB"
      size = size/Math.pow(1024,3)
    }
    return size.toFixed(1) + suffix
  }
  
  function mode(arr) {
    var numMapping = {};
    var greatestFreq = 0;
    var mode;
    arr.forEach(function findMode(number) {
        numMapping[number] = (numMapping[number] || 0) + 1;

        if (greatestFreq < numMapping[number]) {
            greatestFreq = numMapping[number];
            mode = number;
        }
    });
    return +mode;
}


} 


