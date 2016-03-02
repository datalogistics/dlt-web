function topologyMapController($scope, $routeParams, $http, UnisService) {
  var PATH_SEPARATOR = ":"
  var SANITARY = ":"  //TODO: USE THIS....and it cannot be the same as PATH_SEPARATOR

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

  var baseGraph = setOrder(domainsGraph(UnisService, true))

  var graph = subsetGraph(baseGraph, paths)
  var group = basicSetup(svg, width, height)
  var selection = []

  var mouseClick = clickBranch(expandNode, selectNode)
  draw(graph, selection, group, width, height, mouseClick)

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
    draw(graph, selection, group, width, height, mouseClick)
  }

  function selectNode(d, i) {
    //TODO: Heirarchy aware selection? For example: Select grabs all children or selected child that is collapsed is shown as semi-selected parent?
    var key = d.path 
    var at = selection.indexOf(key)
    if (at <0) {selection.push(key)}
    else {selection.splice(at, 1)}
    var graph = subsetGraph(baseGraph, paths) 
    group.selectAll("*").remove()
    draw(graph, selection, group, width, height, mouseClick)
  }
  
  //Cleanup functions here!
  $scope.$on("$destroy", function() {d3.selectAll("#map-tool-tip").each(function() {this.remove()})})  //Cleanup the tooltip object when you navigate away
}
