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
  service.initializeGraph = function(graph, metadata){
    metadata.forEach(function(m){
      graph.forEachLink(function(l){

        dataId = m.id;

        if(!l.data.meta){
          l.data.meta = {};
        }

        // if match metadata with resource, get resource data
        if(l.data.objRef.selfRef == m.subject.href){
          l.data.meta[dataId] = m;
          $http.get('api/data/' + dataId + '?limit=5').then(function(res){
              service.measurementHandler(m, res.data[0], l);
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
        value = handleThroughput(metadata, data, resource);
        attachValue(metadata, value, resource);
      };

  };

  var handleThroughput = function(metadata, data, resource){
      id  = metadata.id;
      resourceId = resource.data.objRef.id;

      console.log("DATA", data);
      val = data.value
      console.log("VALUE", val);
      if(val > 500000000){
        console.log("GREEN");
        $('#' + resourceId).attr('stroke','green');
      }
      else if( val > 200000000){
        $('#' + resourceId).attr('stroke', 'yellow');
      }
      else {
        console.log("RED");
        $('#' + resourceId).attr('stroke', 'red');
      }

      return (val/1000000) + " Mbits/s";
    };


  var attachValue = function(metadata, value, resource){
    console.log(metadata.id);
    try {
      resource.data.meta[metadata.id].value = value;
    } catch(err) {
      console.log("Unable to attach value to metadata", err);
    }

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

      return service.network;

    });
  };

  return service;
}
