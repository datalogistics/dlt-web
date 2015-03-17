/*
 * Rest Services for Depot
 * public/js/services/
 * DepotService.js
 */

var ETS = {
  'used': "ps:tools:blipp:ibp_server:resource:usage:used",
  'free': "ps:tools:blipp:ibp_server:resource:usage:free",
  'user': "ps:tools:blipp:linux:cpu:utilization:user",
  'sys' : "ps:tools:blipp:linux:cpu:utilization:system",
  'in'  : "ps:tools:blipp:linux:network:utilization:bytes:in",
  'out' : "ps:tools:blipp:linux:network:utilization:bytes:out"
};
var MY_ETS = [ETS.used, ETS.free];

var ETS_CHART_CONFIG = {}
var format_timestamp = function(){
  return function(d){
    var ts = d/1e3;
    return d3.time.format('%X')(new Date(ts));
  }
}

var format_GB = function(){
  return function(d){
    return (d/1e9).toFixed(2); // GB
  }
}
var format_rate = function(){
  return function(d){
    return (d/1).toFixed(3);
  }
}

var format_percent = function() {
  return function(d) {return (d*100).toFixed(2)}
}

ETS_CHART_CONFIG[ETS.used] = {selector: "#CHART-Time-GB",
			      xformat: format_timestamp, yformat: format_GB};
ETS_CHART_CONFIG[ETS.free] = {selector: "#CHART-Time-GB",
			      xformat: format_timestamp, yformat: format_GB};
ETS_CHART_CONFIG[ETS.user] = {selector: "#CHART-Time-Percent",
			      xformat: format_timestamp, yformat: format_percent};
ETS_CHART_CONFIG[ETS.sys]  = {selector: "#CHART-Time-Percent",
			      xformat: format_timestamp, yformat: format_percent};
ETS_CHART_CONFIG[ETS.in]   = {selector: "#CHART-Time-Rate",
			      xformat: format_timestamp, yformat: format_rate};
ETS_CHART_CONFIG[ETS.out]  = {selector: "#CHART-Time-Rate",
			      xformat: format_timestamp, yformat: format_rate};

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
      // this search looks for matching ports, mapped to nodes->services->meas
      UnisService.ports.forEach(function(p) {
	if (p.properties && p.properties.ipv4 && p.properties.ipv4.address == ip) {
	  UnisService.nodes.forEach(function(n) {
	    if (n.ports) {
	      n.ports.forEach(function(pref) {
		if (unescape(pref.href) == unescape(p.selfRef)) {
		  servs.forEach(function(s) {
		    if (s.runningOn && unescape(s.runningOn.href) == unescape(n.selfRef)) {
		      meas.forEach(function(m) {
			if (unescape(m.service) == unescape(s.selfRef)) {
			  metas.forEach(function(md) {
			    if (unescape(md.parameters.measurement.href) == unescape(m.selfRef)) {
			      addIfNew(md, metadatas);
			    }})
			}})
		    }})
		}})
	    }})
	}});
    }
    
    var ret = [];
    for (var key in metadatas) {
      ret.push(metadatas[key])
    }
    return ret
  };
  
  function getServiceByMeta(md) {
    var ret = [];
    UnisService.nodes.forEach(function(n) {
      if (n.ports && (n.selfRef == md.subject.href)) {
	UnisService.ports.forEach(function(p) {
	  n.ports.forEach(function(pref) {
	    if (unescape(pref.href) == unescape(p.selfRef)) {
	      var s = UnisService.services;
	      for (var i=0; i<s.length; i++) {
		if (s[i].listeners) {
		  s[i].listeners.forEach(function(l) {
		    var ip = l.tcp.split('/')[0];
		    if (p.address && p.address.address == ip) {
		      ret.push(s[i]);
		    }
		  })
		}
	      }
	    }
	  })
	})
      }
    })
    return getUniqueById(ret);
  };

  function getValues(depot) {
    var mds = depot.metadata;
    // get values for each metadata
    mds.forEach(function(md) {
      if (MY_ETS.indexOf(md.eventType) >= 0) {
	UnisService.getDataId(md.id, 1, function(data) {
	  if (Object.prototype.toString.call(data) === '[object Array]') {
	    if (data.length) {
	      depot[md.eventType] = parseInt(data.pop()['value'])
	    }
	    else {
	      depot[md.eventType] = 0;
	    }
	  }
	  else {
	    depot[md.eventType] = parseInt(data[md.id].pop()['value'])
	  }
	})
      }
    });
  }

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
      })
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
    s.depot = depot;
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
