function topologyService($http, $q){
  service = {};
  service.topology;
  service.domains = [];
  service.nodes = [];
  service.ports = [];
  service.links = [];

  /*
    Initialize Graph Data Values.
  */
  service.initializeGraph = function(graph, UnisService){

    graph.forEachNode(function(n){
        n.data.meta = {};
    });

    UnisService.metadata.forEach(function(m){
        ref = m;
        dataId = m.id;
        console.log(UnisService.getMostRecent(UnisService.links));
        l = UnisService.links.filter(l => l.selfRef == m.subject.href)[0];
        targetNodes = UnisService.nodes.filter(n => n.selfRef == l.properties.sourceRef || n.selfRef == l.properties.destRef);
        graph.forEachNode(function(n){
          if(n.data.objRef.selfRef == targetNodes[0].selfRef || n.data.objRef.selfRef == targetNodes[1].selfRef){
            n.data.meta[dataId] = m;
            n.data.testNode = true;
            $http.get('api/data/' + dataId + '?limit=5').then(function(res){
              
              service.measurementHandler(m, res.data[0], n);
            });
          }
        });



    });

  };

  /*
    Generic Measurement Handler.

    TODO: change esmonduploader to pass archive uri and potentially pass expected 'good' values.
  */
  service.measurementHandler = function(metadata, data, resource){
      console.log(metadata);
      var value;
      if(metadata.eventType == 'throughput'){
        data.value = handleThroughput(metadata, data, resource);
      } else{
        data.value = Math.round(data.value, 2);
      }

      attachValue(metadata, data, resource);

  };

  var handleThroughput = function(metadata, data, resource){
      id  = metadata.id;
      resourceId = resource.data.objRef.id;

      console.log("DATA", data);
      val = data.value
      console.log("VALUE", val);

      //$('#' + resourceId).attr('stroke','green');

      return (val/1000000) + " Mbits/s";
    };


  var attachValue = function(metadata, data, resource){
    console.log(metadata.id);
    try {
      resource.data.meta[metadata.id].value       = data.value;

      timestamp = timeConverter(data.ts)

      resource.data.meta[metadata.id].last_updated = timestamp;
    } catch(err) {
      console.log("Unable to attach value to metadata", err);
    }

  };

  service.handleClusteredEdges = function(graph){
    // find the edge in the network that corresponds to the new dataId

    // network.getClusteredEdges to find the edge that maps to that cluster.

    // change the properties of that edge depending on the data

    return;
  };

  /*
      Pass to the controller everything it needs to create a graph.
  */
  service.createNetwork = function(topoId){

    return $http.get('/api/topologies/'+topoId+'?inline')
    .then(function(res) {

      /* I am so sorry for this abomination, but VisDatasets make finding edges so easy. */
      var domains = new vis.DataSet();
      var nodes = new vis.DataSet();
      var ports = new vis.DataSet();
      var links = new vis.DataSet();

      var colors = ['red', 'DarkViolet', 'lime', 'lightblue', 'pink', 'yellow'];
      var ccnt = 0;

      console.log("RESULT", res)


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
        console.log(data, dset);
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
            console.log(a, b);
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
      	var color = colors[ccnt];
      	ccnt += 1;
        console.log("DOMAIN", d);
      	if ("nodes" in d) {
      	  // find domain nodes
      	  nodes.add(d.nodes.map(e => {return createNode(d, e, color)}));
      	  d.nodes.forEach(function(n) {

      	    // build port DB
      	    if ("ports" in n) {
              try {
              ports.add(n.ports
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
    	  createNodeLinks(d.links, ports);
    	}


  });
      //displayPathById("4994b225-6e58-47a7-99f3-9e3bb8c7d3e6");
      // links connecting domains
      if ("links" in topo) {
	       createNodeLinks(topo.links, domains);
      }

      service.nodes = nodes;
      service.links = links;
      service.domains = domains;
      service.network = {
        nodes: service.nodes,
        links: service.links,
        domains: service.domains
      };
      console.log(service.links);
      return service.network;

    });
  };

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

  return service;
}
