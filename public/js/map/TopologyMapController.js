function topoMapDirective() {
  return {
    restrict: 'E',
    link: function(scope, element, attr) {
      scope.network = new vis.Network(element[0], scope.topodata, scope.topoopts);
      console.log(element);
      scope.network.stabilize();


      canvas = scope.network.canvas.frame.canvas;
    	ctx = canvas.getContext('2d');


    	scope.network.on("beforeDrawing", function(ctx) {
          //ctx.drawImage(document.getElementById("mapImage"), -1000, -1000, 2000,1500);
          ctx.fillStyle = "rgb(211,211,211)";
          ctx.fillRect(-window.innerWidth * 50, -window.innerHeight * 100, window.innerWidth * 100, window.innerHeight * 200);
          for(var n in scope.network.body.nodes){
            var node = scope.network.body.nodes[n];
            // destroys heap, TODO: implement some nutty WebGL for rendering.
            //var color = scope.network.body.data.nodes._data[n].color;
            drawCircle(node.x, node.y, 'rgb(255,255,255)', 75);

          }
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
          console.log(name);
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
	       //scope.toggle(params);
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

function topologyMapController($scope, $route, $routeParams, $http, UnisService, EsmondService, $sce) {
  // XXX: testing vis.js
  var topolist = UnisService.getMostRecent(UnisService.topologies)
      .map(e => {return {id: e.id, name: e.name}});

  EsmondService.closeAllPolls();
  // Get Esmond Data for dash board.
  // First -> grab the instances urls.
  EsmondService.grabPerfsonarUrls(function(res){

    $scope.institutions = res;

    // Second -> get all Interfaces on each instance.
    $scope.institutions.forEach(function(url){
      // get interfaces on each instance
      EsmondService.getAllInterfaces(url, function(res){
        var interfaces = res.interfaces;
        $scope.throughputTests[url] = {"interfaces": {}};
        res.interfaces.forEach(function(inter){

            var iface = inter;
            EsmondService.getTestsOnInterface(url, iface, function(res){

              var i = iface.hostname;

              if(res.length == 0){
                $scope.throughputTests[url] = { "result":"No Test Results"};
              } else {
                $scope.throughputTests[url].interfaces[i] = {"result": "okay",
                  "throughput": res.throughput,
                  "packet_loss": res.packet_loss,
                  "rtt_delay": res.latency,
                  "summary": {},
                  "interface_name": i,
                  "interface": iface,
                  "collapse": false
                };

                /* Init Summaries to avoid race condition messiness */
                $scope.throughputTests[url].interfaces[i].throughput.forEach(function(t, index){
                  $scope.throughputTests[url].interfaces[i].summary[t.destination] = {};
                });

                var inter = $scope.throughputTests[url].interfaces[i];
                inter.throughput.forEach(function(t, index){
                  try {
                    EsmondService.getThroughput(t, function(res){
                      var dst = t.destination;
                      $scope.throughputTests[url].interfaces[i].throughput[index].throughput_val = res;
                      //if(!$scope.throughputTests[url].interfaces[i].summary[dst]) {$scope.throughputTests[url].interfaces[i].summary[dst] = {}};
                      $scope.throughputTests[url].interfaces[i].summary[dst] = {
                        "throughput_val": res,
                        "destination": t.destination,
                        "input-destination": t["input-destination"],
                        "tp_uri": t.uri,
                        "source": t.source
                      };

                    });
                  } catch(err){
                    console.log("COULDNT GET TPUT TEST FOR ", t.destination);
                  }

                });

                inter.packet_loss.forEach(function(p, index){
                  var dst = p.destination;
                  EsmondService.getPacketLoss(p, function(res){
                    //if(!$scope.throughputTests[url].interfaces[i].summary[dst]) {$scope.throughputTests[url].interfaces[i].summary[dst] = {}};
                    $scope.throughputTests[url].interfaces[i].summary[dst].packet_loss_rate = res;
                  });
                });

                inter.rtt_delay.forEach(function(r, index){

                  var dst = r.destination;
                  var rtt_url = r.url + 'histogram-owdelay/base?time-range=' + 150;
                  $scope.throughputTests[url].interfaces[i].summary[dst].latency = {};
                  console.log("GOT IN: ", url, r.source, dst);


                  $scope.throughputTests[url].interfaces[i].summary[dst].latency = {};
                  EsmondService.trackLatency(iface + ':' + r.uri, rtt_url, 5000, function(res){

                    var data = res.data[res.data.length - 1];
                    var mean = 0; var total = 0;

                    if(!data){
                      $scope.throughputTests[url].interfaces[i].summary[dst].latency = {};
                      $scope.throughputTests[url].interfaces[i].summary[dst].latency.mean = "Nothing to Monitor";
                      $scope.throughputTests[url].interfaces[i].summary[dst].latency.median = "No Connection";
                      $scope.throughputTests[url].interfaces[i].summary[dst].latency.error = true;
                      return;
                    }

                    // here we get the median, should clean this up later.
                    var arraydata = [];
                    for(key in data.val){arraydata.push(data.val[key])}
                    var data2 = arraydata.sort( function(a,b) {return a - b;} );
                    var half = Math.floor(data2.length/2)
                    var median = data2[half];

                    for(key in data.val){ mean = mean + data.val[key]; total = total + 1;}
                    $scope.throughputTests[url].interfaces[i].summary[dst].latency = data;
                    $scope.throughputTests[url].interfaces[i].summary[dst].latency.mean = (mean / total);
                    $scope.throughputTests[url].interfaces[i].summary[dst].latency.median = median;
                    $scope.throughputTests[url].interfaces[i].summary[dst].latency.uri = rtt_url;
                    $scope.throughputTests[url].interfaces[i].summary[dst].latency.error = false;
                    //console.log(url, i, r.destination, $scope.throughputTests[url].interfaces[i].summary[dst].latency);
                  });

                });

              }
            });
          });

        });
      });

  }); // End Esmond scope work, seeing as how long this chain is I probably need to fit this into one service call later when I get some feedback.

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
  $scope.esmondGraphRefs = [];
  $scope.currentInstitution = '';
  $scope.currentGraph = {
    "source": '',
    "destination": '',
    "ref": ''
  };


  $scope.toggle = function(p) {
    $scope.cobj = undefined;
    if (p) {
      if (p.nodes.length) {
	       $scope.cobj = nodes.get(p.nodes[0]);
      }
      else if (p.edges.length) {
	       $scope.cobj = links.get(p.edges[0]);
      }
    }
    $scope.checked = !$scope.checked
  }

  $scope.onopen = function () {
    //EsmondService.point
    EsmondService.grabPerfsonarUrls(function(res){
      $scope.institutions = res;
    });
    EsmondService.pointToSpread('http://um-ps01.osris.org', $scope.institutions, function(res){$scope.p2s.push(res)});
  };

  $scope.close = function () {
    $scope.stats_slider = false;
  };

  $scope.graphRef = function(url,src,dst){
    return url + "/perfsonar-graphs/?source=" + src + "&dest=" + dst;
  };

  $scope.trust = function(r){
    return $sce.trustAsResourceUrl(src);
  };

  $scope.buildGraphModal = function(url, src, dst){
    $scope.currentGraph.src = src;
    $scope.currentGraph.dst = dst;
    $scope.currentGraph.url = url;
    var url = $scope.graphRef(url, src, dst)
    $scope.currentGraph.ref = url;
    $scope.currentGraph.ref = $sce.trustAsResourceUrl($scope.currentGraph.ref);
    console.log($scope.currentGraph.ref);
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
  $scope.topoopts = {};

  $http.get('/api/topologies/'+$scope.topoId+'?inline')
    .then(function(res) {

      console.log("RESULT", res)

      // generic filter function
      function ffunc(e) {
  	if (e.ts >= (t_hist)) {
  	  return true;
  	}
      }

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

      var topo = res.data[0];
      console.log(topo)
      domains.add(topo.domains.map(e => {return {id: e.id,
						 name: e.name,
						 node: e.id}
					}));

      topo.domains.forEach(function(d) {
      	var color = $scope.colors[ccnt];
      	ccnt += 1;
      	if ("nodes" in d) {
      	  // find domain nodes
      	  nodes.add(d.nodes.filter(ffunc).map(e => {return createNode(d, e, color)}));
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
          	clusterNodeProperties: {id: d.id, borderWidth: 3, shape: 'database', color: 'orange', label:'domain: ' + d.name}
          };
        $scope.network.cluster(clusterOptionsByData);

    });


  };



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
    $http.get('/api/paths')
      .then(function(res) {

        // generic filter function
        function ffunc(e) {
          if (e.ts >= (t_hist)) {
            return true;
          }
        }
        //console.log("PATHS", res)
        //console.log("FIRST EDGE?: ", $scope.topodata)
        //console.log("FIRST HOP?: ", res.data[0].hops[0])
        //console.log("FIRST HOP ID?: ", res.data[0].hops[0].href.split("links/")[1])
        //console.log("SECOND HOP ID?: ", res.data[0].hops[1].href.split("links/")[1])
        //firstHopId = res.data[0].hops[0].href.split("links/")[1]
        //secondHopId = res.data[0].hops[1].href.split("links/")[1]
        //thirdHopId = res.data[0].hops[2].href.split("links/")[1]
        //console.log("FIRST VIS EDGE: ", $scope.topodata.edges.update({id: firstHopId, width: 5, color:'ff5a00', shadow:{size:40, enabled:true, color:"#ff5a00" } }))
        //console.log("SECOND VIS EDGE: ", $scope.topodata.edges.update({id: secondHopId, width: 5, color:'ff5a00', shadow:{size:40, enabled:true, color:"#ff5a00" } }))
        //console.log("THIRD VIS EDGE: ", $scope.topodata.edges.update({id: thirdHopId, width: 5, color:'ff5a00', shadow:{size:40, enabled:true, color:"#ff5a00" } }))
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

  // --------------- Utilities to load domain data from UNIS ---------------
  // Graph is pair of nodes and links
  // Nodes is a tree
  // links is a list of pairs of paths in the tree
  function unisGraph(UnisService, rootFilter) {

    var ports = UnisService.getMostRecent(UnisService.ports)
                  .map(port => {return {id: port.id, selfRef: port.selfRef, name: port.name}})
                  .filter(Boolean)  // Filters out 'falsy' values, undefined is one of them

    var nodes = UnisService.getMostRecent(UnisService.nodes)
                    .map(e => {return {id: e.id, name: e.name, location: e.location, selfRef: e.selfRef, children: e.ports ? e.ports.map(p => cannonicalURL(p.href)) : []}})
                    .map(e => {e.children = ports.filter(p => e.children.indexOf(cannonicalURL(p.selfRef)) >= 0); return e})

    var domains = UnisService.getMostRecent(UnisService.domains)
                    .map(e => {return {id: e.id, name: e.name, selfRef: e.selfRef, children: e.nodes ? e.nodes.map(n => n.href) : []}})
                    .map(e => {e.children = nodes.filter(n => e.children.indexOf(n.selfRef) >= 0); return e})

    var topologies = UnisService.getMostRecent(UnisService.topologies)
                    .map(e => {return {id: e.id, name: e.name, selfRef: e.selfRef, children: e.domains ? e.domains.map(n => n.href) : []}})
                    .map(e => {e.children = domains.filter(d => e.children.indexOf(d.selfRef) >= 0); return e})

    var root = {id: "root", name: "root", children: topologies}
    var unnamed=buildUnnamedTopology(root, domains, nodes, ports)
    if (unnamed) {topologies.push(unnamed)}

    if (rootFilter) {
      //TODO: Extend so it finds the root in topos or domains
      topologies = topologies.filter(t => t.id == rootFilter)
      topologies = topologies.length == 1 ? topologies[0].children : topologies
    }
    root = {id: "root", name: "root", children: topologies}
    addPaths(root, "")

    var links
    links = UnisService.getMostRecent(UnisService.links)
                   .map(link => {
                     if (link.directed) {
                       return {source: link.endpoints.source.href,
                               sink: link.endpoints.sink.href,
                               directed: false}
                     } else {
                       return {source: link.endpoints[0].href,
                               sink: link.endpoints[1].href,
                               directed: true}
                     }})

    var badlinks = links.filter(l => !validLinks(l))
    links = links.filter(validLinks)
    if (badlinks.length > 0) {console.error("Problematic links dropped for missing source or sink: ", badlinks.length, "\n", badlinks, "\nRetaining " + links.length)}

    links.reduce((acc, link) => {
              if (link.source.startsWith("urn")) {acc.push(link.source)}
              if (link.sink.startsWith("urn")) {acc.push(link.sink)}
              return acc}, [])
        .forEach(endpoint => ensureURNNode(endpoint, root))


    var pathMapping = HREF2Path(topologies)
    links = links.map(link => {return {source: pathMapping[cannonicalURL(link.source)],
                                       sink: pathMapping[cannonicalURL(link.sink)],
                                       directed: link.directed}})

    var badlinks = links.filter(l => !l.source || !l.sink)
    links = links.filter(l => l.source && l.sink)

    var graph = {tree: root, links: links}
    return graph

    function validLinks(link) {
      //TODO: Improve...this is weak link validation...but at least its something
      return link.source && link.sink
              && (link.source.startsWith("urn") || link.source.startsWith("http"))
              && (link.sink.startsWith("urn") || link.sink.startsWith("http"))
    }

    function cannonicalURL(url) {return decodeURIComponent(url.replace(/\+/g, ' '))}

    function addPaths(root, prefix, top) {
      //Add an attributes to each node in the tree with a root-identifier and a full set of ids from root down
      root["path"] = prefix + root.id
      root["__top__"] = top
      if (root.children) {
        root.children.forEach(child => {
          top = root["name"] === "root" ? child["description"] || child["name"] || child["id"] : top
          addPaths(child, root["path"] + PATH_SEPARATOR, top)
        })
      }
    }

    function clearPaths(root) {
      //remove all path attributes seen in the tree
      root["path"] = undefined
      root["__top__"] = undefined
      if (root.children) {root.children.forEach(clearPaths)}
    }

    function buildUnnamedTopology(root, domains, node, ports) {
      //If there are things that are not under a topology, bring them into the tree!

      var unnamed_topo = {id: -1, name: "Other", selfRef: "##unnamed_topology##"}
      var unnamed_domain = {id: -1, name: "Other-Domain", selfRef: "##unnamed_domain##"}
      var unnamed_node = {id: -1, name: "Other-Node", selfRef: "##unnamed_node##"}

      addPaths(root, "") //Touches everything reachable from a topology so the un-named one can be built properly

      unnamed_topo["children"] = domains.filter(d => d.path === undefined)
      clearPaths(unnamed_topo)

      addPaths(unnamed_topo, "")
      unnamed_domain["children"] = nodes.filter(d => d.path === undefined)
      clearPaths(unnamed_topo)

      addPaths(unnamed_topo, "")
      unnamed_node["children"] = ports.filter(d => d.path === undefined)

      clearPaths(root)

      if (unnamed_node.children.length >0) {unnamed_domain.children.push(unnamed_node)}
      if (unnamed_domain.children.length >0) {unnamed_topo.children.push(unnamed_domain)}
      if (unnamed_topo.children.length > 0) {return unnamed_topo;}
      return
    }

    function ensureURNNode(urn, root) {
      var parts = URNtoDictionary(urn)
      if (!parts || !parts.domain || !parts.node || !parts.port) {
        console.error("Could not ensure endpoint", urn); return;
      }

      var domain = root.children.filter(domain => domain.id == parts.domain)
      if (domain.length == 0) {
        domain = {id: parts.domain, children: [], synthetic: true}
        root.children.push(domain)
      } else {domain = domain[0]}

      var node = domain.children.filter(node => node.id == parts.node)
      if (node.length == 0) {
        var node = {id: parts.node, children: [], synthetic: true}
        domain.children.push(node)
      } else {node = node[0]}

      var port = node.children.filter(port => port.id == parts.port)
      if (port.length == 0) {
        var port = {id: parts.port, selfRef: urn, synthetic: true}
        node.children.push(port)
      }
    }

    function HREF2Path(root) {
      function gather(root) {
        //Build a dictionary that maps hrefs to tree paths
        return listing = root.reduce(function(acc, entry) {
          if (entry.children) {acc = acc.concat(gather(entry.children))}
          acc.push({ref: entry.selfRef, path: entry.path})
          return acc
        },
        [])
      }
      var listing = gather(root);
      return listing.reduce((acc, pair) => {acc[cannonicalURL(pair.ref)] = pair.path; return acc}, {})
    }
  }


}
