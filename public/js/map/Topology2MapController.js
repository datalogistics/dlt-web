function topology2MapController($scope, $route, $routeParams, $http, UnisService, SocketService, $sce, $window, TopologyService, $websocket) {

  /* INIT */
  /*
      Scope vars.
  */

  // topology list GUI
  $scope.topolist = UnisService.getMostRecent(UnisService.topologies)
      .map(e => {return {id: e.id, name: e.name}});

  topoId = $routeParams.id
  if (typeof topoId == 'undefined') {
    return;
  }
  console.log(topoId);

  $scope.checked = false;

  $scope.toggle = function(){
    $scope.checked = !$scope.checked;
  };

  $scope.graphRef = function(url,src,dst){
    return url + "/perfsonar-graphs/?source=" + src + "&dest=" + dst;
  };

  $scope.buildGraphModal = function(archive_url, src, dst){
    perfsonarUrl = archive_url.split('/esmond')[0];
    console.log(perfsonarUrl);
    graphUrl = $scope.graphRef(perfsonarUrl, src, dst)
    $scope.modal = {'source': src, 'destination': dst};
    $scope.graphUrl = $sce.trustAsResourceUrl(graphUrl);
  };

  /*
        On graph start up, get the latest values for a tests.

        Called AFTER graph renders.
  */
  var init = function(){
    /* After UnisServie loads make links that have tests show more clearly */
    setTimeout(function(){
        UnisService.metadata.forEach(function(m){
            graph.forEachLink(function(l){
              if(l.data.objRef.selfRef == m.subject.href){
                $('#'+l.data.objRef.id).attr('stroke-width','8px');
                renderer.rerender();
              }
            });
        });

        TopologyService.initializeGraph(graph, UnisService.metadata);

      }, 5000);
  };


  /* * * * * *

      Create the graph.

  * * * * * * */

    var net = TopologyService.createNetwork(topoId).then(function(network){
      // add nodes to graph
      console.log(network);
      network.nodes.forEach(function(n){
        graph.addNode(n.id, n);
      });

      network.links.forEach(function(l){
        console.log('adding link', l);
        graph.addLink(l.from, l.to, l);
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
              highlightRelatedNodes(node.id, true);
        }, function() { // mouse out
              highlightRelatedNodes(node.id, false);
        });

        $(ui).dblclick(function() { // mouse over
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


    /*
      Link SVG stuff.
    */
    var geom = Viva.Graph.geom();
    graphics.link(function(link){

                var ui = Viva.Graph.svg('path')
                           .attr('stroke', 'grey')
                           .attr('id', link.data.objRef.id);

                $(ui).dblclick(function() {
                    $scope.cobj = link.data;
                    $scope.checked = true;
                });

                return ui;

            }).placeLink(function(linkUI, fromPos, toPos) {
                // Here we should take care about
                //  "Links should start/stop at node's bounding box, not at the node center."
                // For rectangular nodes Viva.Graph.geom() provides efficient way to find
                // an intersection point between segment and rectangle
                var toNodeSize = 24,
                    fromNodeSize = 24;
                var from = geom.intersectRect(
                        // rectangle:
                                fromPos.x - fromNodeSize / 4, // left
                                fromPos.y - fromNodeSize / 4, // top
                                fromPos.x + fromNodeSize / 4, // right
                                fromPos.y + fromNodeSize / 4, // bottom
                        // segment:
                                fromPos.x, fromPos.y, toPos.x, toPos.y)
                           || fromPos; // if no intersection found - return center of the node
                var to = geom.intersectRect(
                        // rectangle:
                                toPos.x - toNodeSize / 4, // left
                                toPos.y - toNodeSize / 4, // top
                                toPos.x + toNodeSize / 4, // right
                                toPos.y + toNodeSize / 4, // bottom
                        // segment:
                                toPos.x, toPos.y, fromPos.x, fromPos.y)
                            || toPos; // if no intersection found - return center of the node
                var data = 'M' + from.x + ',' + from.y +
                           'L' + to.x + ',' + to.y;
                linkUI.attr("d", data);
            });

    // we use this method to highlight all realted links
    // when user hovers mouse over a node:
    highlightRelatedNodes = function(nodeId, isOn) {
    // just enumerate all realted nodes and update link color:
    graph.forEachLinkedNode(nodeId, function(node, link){
      var linkUI = graphics.getLinkUI(link.id);
        if (linkUI) {
          // linkUI is a UI object created by graphics below
            linkUI.attr('stroke-dasharray', isOn ? 5 : 0);
        }
      });
    };

    var layout = Viva.Graph.Layout.forceDirected(graph, {
        springLength : 200,
        springCoeff : 0.00005,
        dragCoeff : 0.02,
        gravity : -1.2
    });

    var renderer = Viva.Graph.View.renderer(graph, {
      container: document.getElementById('graphDiv'),
      graphics: graphics,
      layout: layout
    });
    renderer.run();
    console.log(graph);
    init();



  /*
      Listen to Esmond Data

      Use topology service to handle incoming measurements.
  */
  var handle_measurement_data = function(rcv){
      // in case the data cannot get parsed correctly.
      dataId = JSON.parse(rcv).headers.id;


      console.log("Rcv socket data: ", rcv);
      console.log("Metadata: ", UnisService.metadata);

      metadata_match = UnisService.metadata.find(m => m.id == dataId);
      console.log(dataId, metadata_match);
      graph.forEachLink(function(l){
        if(l.data.objRef.selfRef == metadata_match.subject.href){
          TopologyService.measurementHandler(metadata_match, JSON.parse(rcv).data[dataId][0], l);
        }
      });
  };

  var ws = $websocket.$new('ws://um-ps01.osris.org:8888/subscribe/data')
      .$on('$open', function(){
            console.log("Web Socket open.");
      })
      .$on('$message',function(data){
            handle_measurement_data(data);
      });




};

function highlighterDirective($timeout){
  return {
    restrict: 'A',
    scope: {
      model: '=highlighter'
    },
    link: function(scope, element) {
      scope.$watch('model', function (nv, ov) {
        if (nv !== ov) {
          // apply class
          element.addClass('highlight');

          // auto remove after some delay
          $timeout(function () {
            element.removeClass('highlight');
          }, 2000);
        }
      });
    }
  };
}
