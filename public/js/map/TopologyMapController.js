function topologyMapController($scope, $routeParams, $http, UnisService) {
  var PATH_SEPARATOR = ":"

  var groupFilter = $routeParams.group ? $routeParams.group : undefined
  var paths = $routeParams.paths ? [].concat($routeParams.paths) : ["root"] //Pass multiple paths multiple path-entries in the query string 
  paths = paths.map(p => p.startsWith("root:") ? p : "root:" + p)

  var width = 1200
  var height = 500
    
  var svg = d3.select("#topologyMap").append("svg")
               .attr("width", width)
               .attr("height", height)

  var layout = $routeParams.layout ? $routeParams.layout.toLowerCase() : ""
  var baseGraph = setOrder(domainsGraph(UnisService, groupFilter, true))
  //baseGraph = fakeLinks(baseGraph, 3)

  draw(baseGraph, "__top__", paths, svg, layout, width, height)

  var group = basicSetup(svg, width, height)
  var selection = []
  
  //Cleanup functions here!
  //TODO: Move into topology tools...
  $scope.$on("$destroy", function() {d3.selectAll("#map-tool-tip").each(function() {this.remove()})})  //Cleanup the tooltip object when you navigate away

}
