function topoMapDirective() {
  return {
    restrict: 'E',
    link: function(scope, element, attr) {
      scope.network = new vis.Network(element[0], scope.topodata, scope.topoopts);

      scope.network.stabilize();

      scope.network.on("stabilized", function(){
        scope.showPathButtons = true;
        console.log("DONE")
      });

      scope.network.on("selectNode", function(params) {
      	if (params.nodes.length == 1) {
      	  if (scope.network.isCluster(params.nodes[0]) == true) {
      	    scope.network.openCluster(params.nodes[0]);
      	  }
      	}
	      scope.toggle(params);
      });

      scope.network.on("deselectNode", function(params) {
      	scope.toggle(params);
      });

      scope.network.on("selectEdge", function(params) {
	       scope.toggle(params);
      });

      scope.network.on("deselectEdge", function(params) {
      	scope.toggle(params);
      });

    }
  }
}

var OFSW = "http://unis.crest.iu.edu/schema/ext/ofswitch/1/ofswitch#";

function topologyMapController($scope, $route, $routeParams, $http, UnisService) {
  // XXX: testing vis.js
  var topolist = UnisService.getMostRecent(UnisService.topologies)
      .map(e => {return {id: e.id, name: e.name}});

  var ccnt = 0;
  $scope.colors = ['red', 'DarkViolet', 'lime', 'lightblue', 'pink', 'yellow'];

  // page slider control
  $scope.checked = false;
  $scope.size = '100px';
  $scope.showNetpath = false;
  $scope.showPathButtons = false;

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
    alert('Open');
  }

  $scope.onclose = function () {
    alert('Close');
  }

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
      	}
      	else {
      	  n.image = '/images/server-icon.jpg';
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
      	      ports.add(n.ports.filter(ffunc)
      			.map(e => {return {id: e.id,
      					   label: e.name,
      					   node: n.id,
      					   selfRef: e.selfRef,
      					   title: e.description || ""}
      				  }));
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


  }

  $scope.stringify = function(json){
    return JSON.stringify(json)
  }


  //
  //
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



        console.log("PATHS", res)
        console.log("FIRST EDGE?: ", $scope.topodata)
        console.log("FIRST HOP?: ", res.data[0].hops[0])
        console.log("FIRST HOP ID?: ", res.data[0].hops[0].href.split("links/")[1])
        console.log("SECOND HOP ID?: ", res.data[0].hops[1].href.split("links/")[1])
        firstHopId = res.data[0].hops[0].href.split("links/")[1]
        secondHopId = res.data[0].hops[1].href.split("links/")[1]
        thirdHopId = res.data[0].hops[2].href.split("links/")[1]
        console.log("FIRST VIS EDGE: ", $scope.topodata.edges.update({id: firstHopId, width: 5, color:'ff5a00', shadow:{size:40, enabled:true, color:"#ff5a00" } }))
        console.log("SECOND VIS EDGE: ", $scope.topodata.edges.update({id: secondHopId, width: 5, color:'ff5a00', shadow:{size:40, enabled:true, color:"#ff5a00" } }))
        console.log("THIRD VIS EDGE: ", $scope.topodata.edges.update({id: thirdHopId, width: 5, color:'ff5a00', shadow:{size:40, enabled:true, color:"#ff5a00" } }))
      })};

      // Helper function, simply reset how the edge looks to 'reset' the current shown path.
      $scope.clearPaths = function(){
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
                console.log(currentPath);
              }
            }

          })};

      //
      //
      // Grab paths from the host Unis Instance.
      var displayPathById = function(id){

        $scope.clearPaths()

        $scope.currentPathId = id

        $http.get('/api/paths')
          .then(function(res) {

            // generic filter function
            function ffunc(e) {
              if (e.ts >= (t_hist)) {
                return true;
              }
            }

            $scope.currentPathDetails = res

            for(path in res.data){

              if(res.data[path].id == id){
                var hops = res.data[path].hops
                for(i in hops){
                  hopId =  res.data[path].hops[i].href.split("links/")[1]
                  $scope.topodata.edges.update({id: hopId, width: 5, color:'ff5a00',
                                                shadow:{size:40, enabled:true, color:"#ff5a00" }})
                  console.log(i, path)
                }
              }

            }

          })};

            $scope.showNetpath = true
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
