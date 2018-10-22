function topology2MapController($scope, $route, $routeParams, $http, UnisService, $sce, $window, TopologyService) {

  /* INIT */
  topoId = $routeParams.id
  if (typeof topoId == 'undefined') {
    return
  }
  console.log(topoId);

  $scope.topolist = UnisService.getMostRecent(UnisService.topologies)
      .map(e => {return {id: e.id, name: e.name}});
  $scope.checked = false;

  $scope.toggle = function(){
    $scope.checked = !$scope.checked;
  };



  /*
      Create the graph.
  */
  var createVivaGraph = function(){
    var ccnt = 0;

    var net = TopologyService.createNetwork(topoId).then(function(network){
      // add nodes to graph
      console.log(network);
      network.nodes.forEach(function(n){
        graph.addNode(n.id, n);
      });

      network.links.forEach(function(l){
        graph.addLink(l.from, l.to);
      });
    })

    var graph = Viva.Graph.graph();
    var graphics = Viva.Graph.View.svgGraphics();


    /*
          Formats the node. Attach events to node as well.
    */
    graphics.node(function(node) {
       // The function is called every time renderer needs a ui to display node

       var ui = Viva.Graph.svg('g'),
      // Create SVG text element with user id as content
          svgText = Viva.Graph.svg('text').attr('y', '30px').attr('x','-50px').text(node.data.label),
          img = Viva.Graph.svg('image')
                .attr('width', 24)
                .attr('height', 24)
                .link(node.data.image);
                ui.append(svgText);
                ui.append(img);
        $(ui).hover(function() { // mouse over
            console.log(node);
              highlightRelatedNodes(node.id, true);
        }, function() { // mouse out
              highlightRelatedNodes(node.id, false);
        });

        $(ui).click(function() { // mouse over
            $scope.cobj = node.data;
            $scope.checked = true;
        });


        return ui;

    }).placeNode(function(nodeUI, pos){
        // Shift image to let links go to the center:
        nodeUI.attr('transform',
                            'translate(' +
                                  (pos.x - 24/2) + ',' + (pos.y - 24/2) +
                            ')');
    });

    // we use this method to highlight all realted links
    // when user hovers mouse over a node:
    highlightRelatedNodes = function(nodeId, isOn) {
    // just enumerate all realted nodes and update link color:
    graph.forEachLinkedNode(nodeId, function(node, link){
      var linkUI = graphics.getLinkUI(link.id);
        if (linkUI) {
          // linkUI is a UI object created by graphics below
            linkUI.attr('stroke', isOn ? 'yellow' : 'gray');
        }
      });
    };

    var renderer = Viva.Graph.View.renderer(graph, {
      container: document.getElementById('graphDiv'),
      graphics: graphics
    });
    renderer.run();
    console.log(graph);
  };

  createVivaGraph();

};
