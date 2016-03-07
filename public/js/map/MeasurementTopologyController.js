function measurementTopologyController($scope, $routeParams, $http) {
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

  var draw
  $routeParams.layout = $routeParams.layout ? $routeParams.layout.toLowerCase() : ""
  if ($routeParams.layout == "circle") {draw = circleDraw}
  else if ($routeParams.layout == "spoke") {draw = spokeDraw}
  else if ($routeParams.layout == "blackhole") {draw = blackholeDraw}
  else {draw = blackholeDraw}

  $http.get("/api/helm?path=" + path).then(function(rsp) {
    //TODO: Add error reporting...
    var data = rsp.data
    var baseGraph = setOrder(measurementsGraph(data))

    var graph = subsetGraph(baseGraph, paths)
    var group = basicSetup(svg, width, height)
    var selection = []

    var mouseClick = clickBranch(expandNode, selectNode)
    var groupLabel = "domain"
    draw(graph, groupLabel, selection, group, width, height, mouseClick)

    function expandNode(d, i) {
      //TODO: Burn things to the ground is not the best strategy...go for animated transitions (eventaully) with ._children/.children
      //TODO: Preserve inner selection: filter the paths sent to to subset to only those with their parent in the paths (changes the add/remove logic)
      //TODO: Add an alt-click to expand all?
      if (!d._children) {return} 
      var targetParts = d.path.split(PATH_SEPARATOR)
      var newPaths = paths.filter(path => !(path == d.path
                                           || (pathMatch(path, d.path) == targetParts.length)))
      if (newPaths.length == paths.length) {
        newPaths = paths
        newPaths.push(d.path)
      }
      paths = newPaths
      var graph = subsetGraph(baseGraph, paths) 
      group.selectAll("*").remove()
      draw(graph, groupLabel, selection, group, width, height, mouseClick)
    }

    function selectNode(d, i) {
      //TODO: Heirarchy aware selection? For example: Select grabs all children or selected child that is collapsed is shown as semi-selected parent?
      var key = d.path 
      var at = selection.indexOf(key)
      if (at < 0) {selection.push(key)}
      else {selection.splice(at, 1)}
      var graph = subsetGraph(baseGraph, paths) 
      group.selectAll("*").remove()
      draw(graph, groupLabel, selection, group, width, height, mouseClick)
    }
    
    //Cleanup functions here!
    $scope.$on("$destroy", function() {d3.selectAll("#map-tool-tip").each(function() {this.remove()})})  //Cleanup the tooltip object when you navigate away

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

      return {links: links, root: root}
    }
  })
}
