function topoMapDirective() {
  return {
    restrict: 'E',
    link: function(scope, element, attr) {
      scope.network = new vis.Network(element[0], scope.topodata, scope.topoopts);
      console.log(element);
      //scope.network.stabilize();


      canvas = scope.network.canvas.frame.canvas;
      ctx = canvas.getContext('2d');


    	scope.network.on("beforeDrawing", function(ctx) {
          //ctx.drawImage(document.getElementById("mapImage"), -1000, -1000, 2000,1500);
          ctx.fillStyle = "white";
          ctx.fillRect(-window.innerWidth * 50, -window.innerHeight * 100, window.innerWidth * 100, window.innerHeight * 200);
          /*for(var n in scope.network.body.nodes){
            var node = scope.network.body.nodes[n];
            // destroys heap, TODO: implement some nutty WebGL for rendering.
            //var color = scope.network.body.data.nodes._data[n].color;
            drawCircle(node.x, node.y, 'rgb(255,255,255)', 75);

          }*/
          //ctx.globalCompositeOperation = 'source-out';
          //for(var n in scope.network.body.nodes){
          //  var node = scope.network.body.nodes[n];
          //  drawArc(node.x, node.y, 100, 0, 2*Math.PI);
          //}
          //ctx.globalCompositeOperation = 'source-over';
    	});

      scope.network.on("stabilized", function(){
        scope.showPathButtons = true;
      });

      var drawArc = function(x,y,size, degrees, radians){

        ctx.beginPath();
        ctx.arc(x, y, size, degrees, radians);
        ctx.stroke();

      };

      var drawCircle = function(x, y, fillColor, radius){
        ctx.fillStyle = fillColor;
        ctx.circle(x, y, radius);
        ctx.fill();
      }

      scope.network.on("selectNode", function(params) {
      	if (params.nodes.length == 1) {
      	  if (scope.network.isCluster(params.nodes[0]) == true) {
      	    scope.network.openCluster(params.nodes[0]);
      	  }
      	}
	      //scope.toggle(params);
      });

      scope.network.on('select', function(ev){
        scope.$apply();
        console.log(scope.network);
        var open = true;
        if(ev.nodes[0]){
          var nodeId = ev.nodes[0];
          var node = scope.topodata.nodes._data[nodeId];
          var name = node.objRef.name;
          console.log(node);
          scope.institutions.forEach(function(n){

            var test = n.split('//')[1];
            console.log(test, ' - ', name);
            // if the node you selected matches on of the PS nodes, bring up the dashboard.
            if(test == name && !scope.stat_slide){
              console.log("TOPODATA: ", scope.topodata);
              // open the dashboard, pass name into scope.
              var url = 'http://' + name;

              scope.currentInstitution = {
                'name': url,
                'test': scope.throughputTests[url]
              };

              open = false;
              console.log("CURRENT INSTITUTION: ", scope.currentInstitution);
              scope.toggleStats();
              scope.$apply();
            }
          });

        }
        // fixes bug when you click a cluster and resource info slider shows.
        if (ev.nodes.length == 0) {
          console.log(ev);
          return;

        } else if(open){scope.toggle(ev)};
      });

      scope.network.on("deselectNode", function(params) {
      	//scope.toggle(params);
      });

      scope.network.on("selectEdge", function(params) {
        //scope.network.clustering.updateEdge(params.edges[0], {color : '#ff0000', width:10});
      	//scope.toggle(params);

      	// TODO: resolve clustered edges!
      	edge = scope.topodata.edges.get(params.edges[0]);
        edgeID = params.edges[0]
        if(edgeID.includes('cluster')){
          clusteredEdges = scope.network.clustering.getBaseEdges(edgeID);
          firstEdge = scope.topodata.edges.get(clusteredEdges[0]);

          parts = firstEdge.objRef.name.split(":");
          sstr = parts[1];
          dstr = parts[2];
          if (sstr && dstr) {
            scope.changeFilter('source', sstr);
            scope.changeFilter('destination', dstr);
          }
        }
      	/*if (edge) {
      	  var re = /[a-z]+-|^switch:([a-z]+)/i;
      	  var src = scope.topodata.nodes.get(edge.from);
      	  var dst = scope.topodata.nodes.get(edge.to);
      	  console.log(src, dst);
      	  if (src.label && dst.label) {
      	    var sstr = src.label.match(re);
      	    var dstr = dst.label.match(re);
      	    if (sstr && dstr) {
      	      scope.changeFilter('source', sstr[1] || sstr[0]);
      	      scope.changeFilter('destination', dstr[1] || dstr[0]);
      	    }
      	  }
        }*/
      });

      scope.network.on("deselectEdge", function(params) {
      	//scope.toggle(params);
      });

      // animation nation
      //
      // it is probably more difficult than it needs to be to animate things in Vis, that or I am lazy, probably the latter.
      var currentRadius = 0; var animateRadius = true // can disable or enable animation
      var updateFrameVar = setInterval(function() { updateFrameTimer(); }, 60);
      var animatePath = true
      function updateFrameTimer() {
          if (scope.animatePath) {
              scope.network.redraw();
              currentRadius += 1;
          }
      }

      scope.network.on("afterDrawing", function(ctx) {

          if (scope.animatePath) {
            var inode;
            var nodePosition = scope.network.getPositions(scope.nodesInPath);
        	  var arrayLength = scope.topodata.nodes.length;

        	  for (node in nodePosition) {
        		  var colorCircle = 'rgba(255, 165, 0, 0.8)';
        		  var colorBorder = 'rgba(255, 165, 0, 0.2)';
        		  ctx.strokeStyle = colorCircle;
        		  ctx.fillStyle = colorBorder;
        		  var radius = Math.abs(35 * Math.sin(currentRadius / 10));
        		  ctx.circle(nodePosition[node].x, nodePosition[node].y, radius);
        		  ctx.fill();
        		  ctx.stroke();
        	  }

          };

        });


    }
  }
}

var OFSW = "http://unis.crest.iu.edu/schema/ext/ofswitch/1/ofswitch#";

function topologyMapController($scope, $route, $routeParams, $http, UnisService, $sce, $websocket, NgTableParams) {
  // XXX: testing vis.js
  var topolist = UnisService.getMostRecent(UnisService.topologies)
      .map(e => {return {id: (e.id + "?t=all"), name: e.name}});
  console.log(topolist);


  // clean up polling threads on close
  $scope.$on('$destroy',function(){

  });

  $scope.changed_latency = function(id){
    console.log('changed');
    var tag = '#' + id;
    jQuery(tag).toggleClass('latency-changed');
     setTimeout(function(){
       // toggle back after 1 second
       $(tag).toggleClass('latency-changed');
     },1000);
  };


  var ccnt = 0;
  $scope.colors = ['red', 'DarkViolet', 'lime', 'lightblue', 'pink', 'yellow'];

  // scope flow controllers
  $scope.throughputTests = {};
  $scope.checked = false;
  $scope.stats_slide = false;
  $scope.size = '100px';
  $scope.showNetpath = false;
  $scope.showPathButtons = false;
  $scope.nodesInPath = [];
  $scope.animatePath = false;
  $scope.p2s = [];
  $scope.institutions = [];
  $scope.EsmondGraphRefs = [];
  $scope.tests = {};
  $scope.t_data = [];
  $scope.currentInstitution = '';
  $scope.currentGraph = {
    "source": '',
    "destination": '',
    "ref": ''
  };

  $scope.testSrc = "";
  $scope.testDst = "";

  $scope.tableParams = new NgTableParams({
    // filtering overload
    filter: {source: $scope.testSrc,
	     destination: $scope.testDst}
  },{
    dataset: $scope.t_data
  });

  $scope.changeFilter = function changeFilter(field, value) {
    var filter = {};
    filter[field] = value;
    angular.extend($scope.tableParams.filter(), filter);
  }

  $scope.swapFilter = function () {
    filter = {
      source: jQuery('[name="destination"]').val(),
      destination: jQuery('[name="source"]').val()
    }
    angular.extend($scope.tableParams.filter(), filter);
  }

  $scope.toggle = function(p) {

    $scope.cobj = undefined;
    if (p) {
      if (p.nodes.length) {
	       $scope.cobj = nodes.get(p.nodes[0]);
         console.log($scope.cobj.objRef.testNode);
      }
      else if (p.edges.length) {
	       $scope.cobj = links.get(p.edges[0]);
      }
    }
    $scope.checked = !$scope.checked
  }

  $scope.onopen = function () {

  };

  $scope.close = function () {
    $scope.stats_slide = false;
  };

  $scope.graphRef = function(url,src,dst){
    return url + "/perfsonar-graphs/?source=" + src + "&dest=" + dst;
  };

  $scope.trust = function(r){
    return $sce.trustAsResourceUrl(src);
  };

  $scope.buildGraphModal = function(archive_url, src, dst){
    perfsonarUrl = archive_url.split('/esmond')[0];
    console.log(perfsonarUrl);
    graphUrl = $scope.graphRef(perfsonarUrl, src, dst)
    $scope.modal = {'source': src, 'destination': dst};
    $scope.graphUrl = $sce.trustAsResourceUrl(graphUrl);
  };

  // scope data
  $scope.data = {
    model: null,
    topoOptions: topolist
  };

  // controller is done if no ID is given
  $scope.topoId = $routeParams.id
  if (typeof $scope.topoId == 'undefined') {
    return
  }

  // url param to specify resource history view
  var t_hist = $routeParams.t || 60; // default to last hour
  var now_usec = new Date().getTime() * 1e3;
  if (t_hist == "all") {
    t_hist = 0;
  }
  else {
    t_hist = (now_usec-(t_hist*60*1e6));
  }

  var domains = new vis.DataSet();
  var nodes = new vis.DataSet();
  var ports = new vis.DataSet();
  var links = new vis.DataSet();

  $scope.domains = domains;
  $scope.topodata = {
    nodes: nodes,
    edges: links
  };
  console.log(nodes , links);

  $scope.physics = true;
  $scope.togglePhysics = function(){
    console.log($scope.network);
    if($scope.physics){
      $scope.network.setOptions({physics: false});
    } else if (!$scope.physics){
      $scope.network.setOptions({physics: true});
    }
    $scope.physics = !$scope.physics;

  }

  $scope.topoopts = {
    physics: { //stabilization: { enabled: false},
               //repulsion: {springConstant: 0.01, nodeDistance: 50},
               solver: "forceAtlas2Based",
               stabilization: {
                    enabled: true,
                    iterations: 1000,
                    updateInterval: 25
                }
             }
  };

  function createNode(d, e, color) {
    var n = {id: e.id,
       label: e.name,
       domain: d.id,
       color: color,
       objRef: e,
       title: e.description || ""}

    if (e.$schema == OFSW) {
      n.image = '/images/switch-icon.png';
      n.shape = 'image';
    } else if(e.name.includes('ps')){
      n.image = '/images/database.png';
      n.shape = 'image';
    }
    else {
      n.image = '/images/server_icon.png';
      n.shape = 'image';
    }

    return n;
  }

  function createNodeLinks(data, dset) {
    data.reduce((acc, link) => {
      if (link.endpoints &&
          link.endpoints[0].href.startsWith("http") &&
          link.endpoints[1].href.startsWith("http")) {
        acc.push({a: link.endpoints[0].href,
            b: link.endpoints[1].href,
            id: link.id,
            ref: link})
      } return acc}, [])
      .forEach(function(e) {
        var a = dset.get(e.a.split('/').pop());
        var b = dset.get(e.b.split('/').pop());
        if (a && b) {
          links.add({id: e.id,
             objRef: e.ref,
             from: a.node,
             to: b.node,
             color: 'black'})
        }
      });
  }

  $http.get('/api/topologies/'+$scope.topoId+'?inline')
    .then(function(res) {

      console.log("RESULT", res)

      // generic filter function
      function ffunc(e) {
      	if (e.ts >= (t_hist)) {
      	  return true;
      	}
      }



      var topo = res.data[0];
      console.log(topo)
      domains.add(topo.domains.map(e => {return {id: e.id,
						 name: e.name,
						 node: e.id}
					}));

      topo.domains.forEach(function(d) {
      	var color = $scope.colors[ccnt];
      	ccnt += 1;
        console.log("DOMAIN", d);
      	if ("nodes" in d) {
      	  // find domain nodes
      	  //nodes.add(d.nodes.filter(ffunc).map(e => {return createNode(d, e, color)}));
          f_nodes = d.nodes.filter(ffunc).map(e => {return createNode(d, e, color)})
          f_nodes.forEach(function(n){
            try{
              nodes.add(n);
            } catch(err){
              console.log(err);
            }
          })
      	  d.nodes.forEach(function(n) {
      	    // build port DB
      	    if ("ports" in n) {
              try {
              ports.add(n.ports.filter(ffunc)
        			.map(e => {return {id: e.id,
        					   label: e.name,
        					   node: n.id,
        					   selfRef: e.selfRef,
        					   title: e.description || ""}
        				  }));
              } catch (err){
                console.log(err);
              }

      	    }
      	  });
	       }
    	else {
    	  // add domain placeholder nodes
    	  nodes.add({id: d.id,
    		     label: d.name,
    		     domain: d.name,
    		     color: color,
    		     title: d.name+" placeholder"})
    	}

    	// links connecting nodes
    	if ("links" in d) {
    	  createNodeLinks(d.links.filter(ffunc), ports);
    	}


  });
  //displayPathById("4994b225-6e58-47a7-99f3-9e3bb8c7d3e6");
  console.log(links)
      // links connecting domains
      if ("links" in topo) {
	       createNodeLinks(topo.links, domains);
      }
    });

  $scope.clusterByDomain = function() {
    $scope.clearPaths()
    var clusterOptionsByData;
    $scope.domains.forEach(function(d) {
        clusterOptionsByData = {
        	joinCondition: function (childOptions) {
          	  return childOptions.domain == d.id;
          	},
          	processProperties: function (clusterOptions, childNodes, childEdges) {
          	  var totalMass = 0;
          	  for (var i = 0; i < childNodes.length; i++) {
          	    totalMass += childNodes[i].mass;
          	  }
          	  clusterOptions.mass = totalMass;
          	  return clusterOptions;
          	},
          	clusterNodeProperties: {id: d.id, borderWidth: 3, shape: 'database', label:'domain: ' + d.name},
            clusterEdgeProperties: {color: { inherit: null}}

          };
        $scope.network.cluster(clusterOptionsByData);

    });

    console.log("Cluster", $scope.network);
    console.log("Clustered nodes", $scope.network.clusteredNodes);
    // network.getClusteredEdges


  };

  var attachValue = function(metadata, data, resource){
    console.log("meta",metadata);
    console.log("data", data);
    console.log("resource", resource);
    try {
      resource.objRef.meta[metadata.id] = metadata;
      resource.objRef.meta[metadata.id].value = data.value;

      timestamp = timeConverter(data.ts)

      resource.objRef.meta[metadata.id].last_updated = timestamp;
      console.log("After attach", resource);
    } catch(err) {
      console.log("Unable to attach value to metadata", err);
    }

  };

  var handleThroughput = function(metadata, data, resource){
      id  = metadata.id;
      resourceId = resource.objRef.id;

      console.log("DATA", data);
      val = data.value
      console.log("VALUE", val);

      return (val/1000000).toFixed(2) + " Mbits/s";
    };

  var measurementHandler = function(metadata, data, resource){
      console.log(metadata);
      var value;
      if(metadata.eventType == 'throughput'){
        data.value = handleThroughput(metadata, data, resource);
      } else{
        data.value = Math.round(data.value, 2);
      }

      attachValue(metadata, data, resource);

  };

  var init = function(){
    console.log(UnisService);
    /* After UnisService loads make links that have tests show more clearly */
    setTimeout(function(){

        initializeGraph();
        $scope.clusterByDomain();
        //handleClusteredEdges();
      }, 3500);
  }; init();

  $scope.handleClusteredEdges = function(){
    console.log("network", $scope.network);
    for(e in $scope.topodata.edges._data){
      edge = $scope.topodata.edges._data[e];
      if(edge.metadata_id){

        metaID = edge.metadata_id;
        clusterEdge = $scope.network.clustering.getClusteredEdges(e);

        connectedNodes = $scope.network.getConnectedNodes(e);
        node_a = $scope.topodata.nodes._data[connectedNodes[0]];
        node_b = $scope.topodata.nodes._data[connectedNodes[1]];

        test = node_a.objRef.meta[metaID];

        //$scope.network.clustering.updateEdge(e, {width: 10, color: { color:'#ff0000'}});
        console.log('test', test);
        if(test.eventType == 'throughput'){
          handleClusterTestEdge(test, e);
        }

      }

    }
  };

  var handleClusterTestEdge = function(test, edge){
    function getColor(value){
        //value from 0 to 1
        var hue=((1-value)*120).toString(10);
        return ["hsl(",hue,",100%,50%)"].join("");
    }
    if(test.eventType == "throughput" && test.value){
      val = parseFloat(test.value.split(' ')[0]);
      console.log('val', val);
      color = getColor(1 - (val/10000));
      $scope.network.clustering.updateEdge(edge, {width: 10, color: { color:color}});
    }
  }

  var initializeGraph = function(){

    for(n in $scope.topodata.nodes._data){

        node = $scope.topodata.nodes._data[n].objRef.meta = {};
    }

    UnisService.metadata.forEach(function(m){
        ref = m;
        dataId = m.id;
        l = UnisService.links.filter(l => l.selfRef == m.subject.href)[0];
        targetNodes = UnisService.nodes.filter(n => n.selfRef == l.properties.sourceRef || n.selfRef == l.properties.destRef);
        subjectIDs = [];
        for(node in $scope.topodata.nodes._data){
          n = $scope.topodata.nodes._data[node];
          if(n.objRef.selfRef == targetNodes[0].selfRef || n.objRef.selfRef == targetNodes[1].selfRef){
            subjectIDs.push(node);
            n.objRef.meta[dataId] = m;
            n.objRef.testNode = true;
            $http.get('api/data/' + dataId + '?limit=1').then(function(res){
              //console.log('n', n);
              measurementHandler(m, res.data[0], n);
              for(id in n.objRef.meta){
                if(!$scope.tests[id]){
                  n.objRef.meta[id].source = n.objRef.meta[id].parameters.source;
                  n.objRef.meta[id].destination = n.objRef.meta[id].parameters.destination;
                  $scope.t_data.push(n.objRef.meta[id]);
                }
                $scope.tests[id] = n.objRef.meta[id];
              }

            });
          }
        }
        e = $scope.topodata.edges.add({to: subjectIDs[0], from: subjectIDs[1], objRef:l, metadata_id: m.id, color:'#ff0000', width:10})
        clusterEdge = $scope.network.clustering.getClusteredEdges(e);
    });

};





  var handle_measurement_data = function(rcv){
      // in case the data cannot get parsed correctly.
      dataId = JSON.parse(rcv).headers.id;

      console.log("Scope Network", $scope.network);
      console.log("Rcv socket data: ", rcv);
      console.log("Metadata: ", UnisService.metadata);

      m = UnisService.metadata.find(m => m.id == dataId);
      l = UnisService.links.filter(l => l.selfRef == m.subject.href)[0];
      console.log("l", l);
      node_a = UnisService.nodes.forEach(n => n.selfRef == l.properties.sourceRef)[0];
      node_b = UnisService.nodes.filter(n => n.selfRef == l.properties.destRef)[0];
      vis_nodes = $scope.network.selectNodes([node_a.id, node_b.id]);
      console.log($scope.topodata.nodes._data[node_a.id]);

      /*console.log(dataId, metadata_match);
      graph.forEachLink(function(l){
        if(l.data.objRef.selfRef == metadata_match.subject.href){
          TopologyService.measurementHandler(metadata_match, JSON.parse(rcv).data[dataId][0], l);
        }
      });*/
  };

  var ws = $websocket('ws://iu-ps01.osris.org:8888/subscribe/data')
      .onOpen(function(){
            console.log("Web Socket open.")
      })
      .onMessage(function(data){
            console.log("New data", data.data);
            handle_measurement_data(data.data);
      })
      .onError(function(e){
        console.log("WS ERROR:", e);
      })
      .onClose(function(e){
        console.log("WS CLOSE:",e);
      });

  $scope.stringify = function(json){
    return JSON.stringify(json)
  }

  $scope.toggleStats = function(){
    $scope.stats_slide = !$scope.stats_slide;
  };


  //
  // Really just a debug function to spit out a bunch of JSON objects to console.
  // Grab paths from the host Unis Instance.
  var getPaths = function(){
    return;
    $http.get('/api/paths')
      .then(function(res) {

        // generic filter function
        function ffunc(e) {
          if (e.ts >= (t_hist)) {
            return true;
          }
        }

      })};

      // Helper function, simply reset how the edge looks to 'reset' the current shown path.
      $scope.clearPaths = function(){
        $scope.animatePath = false
        $scope.nodesInPath = []
        for(edge in $scope.topodata.edges._data){
          $scope.topodata.edges.update({id: edge, width: 1,
                                        shadow:{size:40, enabled:false, color:"#ff5a00" }})
        }
        $scope.showNetpath = false
      }

      $scope.getNetPath = function(){

        $http.get('/api/paths/')
          .then(function(res) {

            // generic filter function
            function ffunc(e) {
              if (e.ts >= (t_hist)) {
                return true;
              }
            }

            for(path in res.data){

              if(res.data[path].id == $scope.currentPathId){
                var currentPath = res.data[path];
                return currentPath;
                console.log(currentPath);
              }
            }

          })};

      //
      //
      // Grab paths from the host Unis Instance.
      var displayPathById = function(id){

        $scope.clearPaths()
        $scope.currentPathId = id;

        $http.get('/api/paths')
          .then(function(res) {

            // generic filter function
            function ffunc(e) {
              if (e.ts >= (t_hist)) {
                return true;
              }
            }



            for(path in res.data){

              if(res.data[path].id == id){
                $scope.currentPathDetails = res.data[path]
                var hops = res.data[path].hops
                for(i in hops){
                  hopId =  res.data[path].hops[i].href.split("links/")[1]
                  $scope.topodata.edges.update({id: hopId, width: 5, color:'ff5a00',
                                                shadow:{size:40, enabled:true, color:"#ff5a00" }})

                  edge = $scope.topodata.edges._data[hopId]
                  $scope.nodesInPath.push(edge.to)
                  $scope.nodesInPath.push(edge.from)
                }
              }

            }

            $scope.showNetpath = true;
            $scope.animatePath = true;
          })};

          $scope.displayPath = function(id){
            displayPathById(id)
          }

          $scope.paths = []
          $http.get('/api/paths')
            .then(function(res) {
              // generic filter function
              function ffunc(e) {
                if (e.ts >= (t_hist)) {
                  return true;
                }
              }
              for(path in res.data){
                pathId = res.data[path].id
                $scope.paths.push(pathId)
              }
            });

          console.log("PATH IDS: ", $scope.paths)

}

function timeConverter(UNIX_timestamp){
  var a = new Date(UNIX_timestamp * 1000);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var year = a.getFullYear();
  var month = months[a.getMonth()];
  var date = a.getDate();
  var hour = a.getHours();
  var min = a.getMinutes();
  var sec = a.getSeconds();
  var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
  return time;
}

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
