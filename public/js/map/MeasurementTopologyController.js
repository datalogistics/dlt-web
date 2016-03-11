function measurementTopologyController($scope, $routeParams, $http, UnisService) {
  var PATH_SEPARATOR = ":"

  var path = $routeParams.path

  var groupFilter = $routeParams.group ? $routeParams.group : undefined
  var paths = $routeParams.paths ? [].concat($routeParams.paths) : ["root"] //Pass multiple paths multiple path-entries in the query string 
  paths = paths.map(p => p.startsWith("root:") ? p : "root:" + p)

  var width = 1200
  var height = 500
    
  var svg = d3.select("#topologyMap").append("svg")
               .attr("width", width)
               .attr("height", height)

  var layout = $routeParams.layout ? $routeParams.layout.toLowerCase() : ""
  var groupLabel = "domain"

  $http.get("/api/helm?path=" + path).then(function(rsp) {
    //TODO: Add error reporting...
    var data = rsp.data
    var baseGraph = setOrder(measurementsGraph(data))

    var actions = {linkClick: showMeasurement}
    
    draw(baseGraph, groupLabel, paths, svg, layout, width, height, actions)


    function showMeasurement(links) {
      var ids = links.map(l => l.id)
      var measures = UnisService.measurements.filter(m => ids.indexOf(m.id) >=0).map(m => m.selfRef)
      var metas = UnisService.metadata.filter(m => measures.indexOf(m.parameters.measurement.href) >= 0)
      metas = metas.filter(m => m.eventType !="ps:tools:blipp:linux:net:traceroute:hopip")
      metas.forEach(showdata)
    }

    function showdata(metadata) {
      // todo add a way to configure which labels or event types open up in a dialog and which open in a new window
      // maybe give a button which can be used to toggle behavior
        var params = {
          id : metadata.id,
          title : metadata.eventtype,
          subtitle : metadata.id 
        };
        window.open('/popup/graphs?'+$.param(params),null, "width=600,height=420,resizable,scrollbars,status");
    };


    function measurementsGraph(data) {
      //Convert the helm response to the topology graph format
      function addPaths(root, prefix) {
        root["path"] = prefix + root.id 
        if (root.children) {root.children.forEach(child => addPaths(child, root["path"] + PATH_SEPARATOR))}
      }

      var nodes = data.nodes
                    .map(n => {return {id: n, children: []}})
                    .reduce((acc, n) => {acc[n.id] = n; return acc;}, {})
      data.ports.forEach(p => nodes[p.node].children.push({id: p.id}))

      var root = {
        id: "root", 
        path: "root", 
        children: Object.keys(nodes).reduce((acc, id) => {acc.push(nodes[id]); return acc;}, [])
      }

      addPaths(root, "") 
      var ports = gatherLeaves(root).reduce((acc, p) => {acc[p.id] = p; return acc;}, {})
      var links = data.measurements.map(m => {
        return {source: ports[m.src].path, 
                sink: ports[m.dest].path, 
                id: m.measurement}})

      //TODO: Link consolidation: Same source/sink => one path with multiple measurements
      return {links: links, tree: root}
    }
  })
  
  //Cleanup functions here!
  //TODO: Move into topology tools...
  $scope.$on("$destroy", function() {d3.selectAll("#map-tool-tip").each(function() {this.remove()})})  //Cleanup the tooltip object when you navigate away
}
