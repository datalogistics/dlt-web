/*
 * Rest Services for Depot
 * public/js/services/
 * DepotService.js
 */

function depotService($http, UnisService, CommChannel) {
  var service = {};
  
    // depots is a map of service IDs
  service.depots = {};
  
  function getMetadata(s) {
    var metadatas = [];
    var meas = UnisService.measurements;
    var metas = UnisService.metadata;
    var servs = UnisService.services;

    addIfNew = function(md, seen) {
      if (((md.eventType in seen) && (seen[md.eventType].ts < md.ts)) ||
	  (!(md.eventType in seen) && (md.eventType in ETS_CHART_CONFIG))) {
	seen[md.eventType] = md;
      }
    };

    // this case is brutal because our metadata is missing subject hrefs
    // perhaps can fix in blipp for IDMS
    var ip = s.accessPoint.split(':')[1].replace('//', '');
    // this search matches on measurement commands
    for(var i = 0; i < meas.length; i++) {
      if(meas[i].configuration && meas[i].configuration.command) {
	if(meas[i].configuration.command.split(" ")[1] == ip) {
	  for(var j = 0; j < metas.length; j++) {
	    if (metas[j].parameters.measurement.href.split('/')[4] == meas[i].id) {
	      addIfNew(metas[j], metadatas);
	    }
	  }
	}
      }
      //this search looks for matching ports, mapped to nodes->services->meas
      var pmap = UnisService.portsIpMap;
      //var nmap = UnisService.nodesPrefHrefMap;
      var smap = UnisService.servicesRunonMap;
      var measmap = UnisService.measServMap;
      var metamap = UnisService.metaMap;
      // creating a map for each query in UnisService - Leaving out just nodes - Will come back later when things seem fine
      (pmap[ip] || []).forEach(function(p) {
	UnisService.nodes.forEach(function(n) {
      	    if (n.ports) {
      	      n.ports.forEach(function(pref) {
      		if (unescape(pref.href) == unescape(p.selfRef)) {
      		  (smap[unescape(n.selfRef)]||[]).forEach(function(s) {
		    (measmap[unescape(s.selfRef)]||[]).forEach(function(m) {
      		      if (true && unescape(m.service) == unescape(s.selfRef)) {
      			(metamap[unescape(m.selfRef)]||[]).forEach(function(md) {
      			  addIfNew(md, metadatas);
      			});
      		      }});
      		    });
      		}});
      	    }});
      });       
    }    
    var ret = [];
    for (var key in metadatas) {
      ret.push(metadatas[key])
    }
    return ret
  };
  
  function getServiceByMeta(md) {
    var ret = [];
    var pmap = UnisService.portsSelfRefMap;
    var nmap = UnisService.nodeSelfRefMap;
    var smap = UnisService.servicesRunonMap;
    var measmap = UnisService.measServMap;
    var metamap = UnisService.metaMap;
    (nmap[md.subject.href] || []).forEach(function(n) {
      if (n.ports && $.isArray(n.ports))
      n.ports.forEach(function(pref) {
    	(pmap[pref.href]||[]).forEach(function(p) {
    	  var s = UnisService.services;
    	  for (var i=0; i<s.length; i++) {
    	    if (s[i].listeners) {
    	      s[i].listeners.forEach(function(l) {
    		var ip = l.tcp.split('/')[0];
    		if (p.address && p.address.address == ip) {
    		  ret.push(s[i]);
    		}
    	      });
    	    }
    	  }
    	});
      });
    });
    // UnisService.nodes.forEach(function(n) {
    //   if (n.ports && (n.selfRef == md.subject.href)) {
    // 	UnisService.ports.forEach(function(p) {
    // 	  n.ports.forEach(function(pref) {
    // 	    if (unescape(pref.href) == unescape(p.selfRef)) {
    // 	      var s = UnisService.services;
    // 	      for (var i=0; i<s.length; i++) {
    // 		if (s[i].listeners) {
    // 		  s[i].listeners.forEach(function(l) {
    // 		    var ip = l.tcp.split('/')[0];
    // 		    if (p.address && p.address.address == ip) {
    // 		      ret.push(s[i]);
    // 		    }
    // 		  })
    // 		}
    // 	      }
    // 	    }
    // 	  })
    // 	})
    //   }
    // })
    return getUniqueById(ret);
  };

  function getValues(depot) {
    var mds = depot.metadata;

    // get values for each metadata
    mds.forEach(function(md) {
      if (MY_ETS.indexOf(md.eventType) >= 0) {
	onData = function(data) {
          var isRate = false;
          if (/network:/.test(md.eventType)) {
            isRate = true;
          }
	  // in case we do ask for the most recent value right away again...
          var depotData = [];
          var oldDepotDt = [];
          if($.isArray(data)) {
            // data from the subscription
            depotData = data.pop();
            oldDepotDt = data[data.length-1];
          } else {
            // this gets the last element, which is the most recent in a published message
            depotData = data[md.id].pop();
            oldDepotDt = data[md.id][data[md.id].length-1];
          }
          var y = Number(depotData.value) || 0;
          if (isRate) {
            var x = Number(depotData.ts) || 0;
            var oldx = Number(oldDepotDt.ts) || 0;
            var oldy = Number(oldDepotDt.value) || 0;            
            var timeD = x/1e6 - oldx/1e6;
            // Now use this old value to calculate rate
            var yVal;
            if (Math.round(timeD) == 0)
              yVal = y;
            else 
              yVal = ((y - oldy) / timeD).toFixed(2);
            depot[md.eventType] =  yVal;
          } else {            
            depot[md.eventType] = y;
          }
	};	
	UnisService.subDataId(md.id, onData, "depot_"+md.id);
      }
    });
  };

  function updateDepots(md) {
    if (MY_ETS.indexOf(md.eventType) >= 0) {
      var services = getServiceByMeta(md)
      services.forEach(function(s) {
	for (var key in service.depots) {
	  var d = service.depots[key];
	  if (d.service.id == s.id) {
	    // don't duplicate
	    var found = 0;
	    for (var i=0; i<d.metadata.length; i++) {
	      if (d.metadata[i].eventType === md.eventType) {
		found = 1;
	      }
	    }
	    if (!found) {
	      d.metadata.push(md);
	      getValues(d);
	    }
	  }
	}
      });
    }
  };
  
  function createDepot(s) {
    var mds = getMetadata(s);
    var depot = {
      'metadata': mds,
      'service': s
    };
    getValues(depot);
    service.depots[s.id] = depot;
    // save a reference to the depot object in the service entry
    s.sref = depot;
  };
  
  // depot tracking service waits until UNIS has data
  UnisService.init().then(function() {
    console.log("Depot service initializing...");
    
    UnisService.services.forEach(function(s) {
      if (s.serviceType == "ibp_server") {
	createDepot(s);
      }
    });
  });

  CommChannel.onNewData('new_service', function(s) {
    if (s.serviceType == "ibp_server") {
      createDepot(s);
    }
  });

  CommChannel.onNewData('new_metadata', function(md) {
    // update depot eT mappings when we see new metadata
    updateDepots(md);
  });

  CommChannel.onNewData('new_port', function(md) {
    // update depot service intitution names (gleaned from nodeRef URNs)
    for (var key in service.depots) {
      var d = service.depots[key];
      getInstitutionName(d.service);
    }
  });

  return service;
}
