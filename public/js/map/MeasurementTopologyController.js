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
  var groupLabel = "node"

  var helmEdits = {}
  function submitToHelm() {
    var toHelm = function(node) {
      return {'domain': node.domain,
              'node': node.node,
              'port': node.id,
              'address': node.ipv4}
    }

    var inserts = helmEdits["insert"].map(pair=>pair.map(toHelm))
    var deletes = helmEdits["delete"].map(e => e.id)
   
    var msg = {insert: inserts, delete: deletes}
    console.log("Submitting edits to helm", msg)
    //$http.post("/api/helm?op=edits", msg)
  }

  var submit = d3.select("#topologyMap").append("button")
                .attr("disabled", "True")
                .attr("id", "HelmSubmit")
                .text("Submit Edits")
                .on("click", submitToHelm)

  $http.get("/api/helm?path=" + path).then(function(rsp) {
    //TODO: Add error reporting...
    var data = rsp.data
    var baseGraph = setOrder(measurementsGraph(data))
    var actions = {linkClick: editMeasurement,
                   editFilter: "[depth='2']",
                   editProgress: queueForHelm}
    
    draw(baseGraph, groupLabel, paths, svg, layout, width, height, actions)

    function queueForHelm(edits) {
      if (edits.delete.length > 0 || edits.insert.length > 0) {
        document.getElementById("HelmSubmit").disabled=false
      } else {
        document.getElementById("HelmSubmit").disabled=true
      }

     function findNode(path, tree, prior) {
       if (tree.path == path) {return tree}
       if (tree.children === undefined) {return prior}
       var found = tree.children.reduce((acc, child) => findNode(path, child, acc))
       return found === undefined ? prior : found
     }

     helmEdits = {delete: edits.delete, 
                 insert: edits.insert.map(e => [findNode(e[0], baseGraph.tree), findNode(e[1], baseGraph.tree)])}
    }


    function editMeasurement(link, event, edits) {
      console.log("TODO: Show edit panel and record details in the edit model.")
    }

    function measurementsGraph(data) {
      //Convert the helm response to the topology graph format
      function addPaths(root, domain, prefix) {
        root["path"] = prefix + root.id 
        root["domain"] = root["domain"] ? root["domain"] : domain
        if (root.children) {root.children.forEach(child => addPaths(child, root["domain"], root["path"] + PATH_SEPARATOR))}
      }

      var nodes = data.nodes
                    .map(n => {return {id: n.name, node:n.name, domain: n.domain, children: []}})
                    .reduce((acc, n) => {acc[n.id] = n; return acc;}, {})
      data.ports.forEach(p => nodes[p.node].children.push(p))

      var root = {
        id: "root", 
        path: "root", 
        children: Object.keys(nodes).reduce((acc, id) => {acc.push(nodes[id]); return acc;}, [])
      }

      addPaths(root, undefined, "") 
      var ports = gatherLeaves(root).reduce((acc, p) => {acc[p.id] = p; return acc;}, {})
      var links = data.measurements
        .filter(m => m.dest && m.src)
        .map(m => {return {source: ports[m.src].path, 
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
