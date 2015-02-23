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

var ETS_CHART_CONFIG = {}

function depotService($http, UnisService) {
  var service = {};
  
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
  ETS_CHART_CONFIG[ETS.in]   = {selector: "#CHART-Time-Percent",
				xformat: format_timestamp, yformat: format_percent};
  ETS_CHART_CONFIG[ETS.out]  = {selector: "#CHART-Time-Percent",
				xformat: format_timestamp, yformat: format_percent};
  
  // depots is a map of service IDs
  service.depots = {};
  
  function getMetadata(s) {
    var metadatas = [];
    var seen_ets = [];
    var meas = UnisService.measurements;
    var metas = UnisService.metadata;
    var servs = UnisService.services;
    
    // this case is brutal because our metadata is missing subject hrefs
    // perhaps can fix in blipp for IDMS
    var ip = s.accessPoint.split(':')[1].replace('//', '');
    // this search matches on measurement commands
    for(var i = 0; i < meas.length; i++) {
      if(meas[i].configuration.command) {
	if(meas[i].configuration.command.split(" ")[1] == ip) {
	  for(var j = 0; j < metas.length; j++) {
	    if ((seen_ets.indexOf(metas[j].eventType) == -1) &&
		(metas[j].parameters.measurement.href.split('/')[4] ==
		 meas[i].id)) {
	      metadatas.push(metas[j]);
	      seen_ets.push(metas[j].eventType);
	    }
	  }
	}
      }
      // this search looks for matching ports, mapped to nodes->services->meas
      UnisService.ports.forEach(function(p) {
	if (p.properties.ipv4 && p.properties.ipv4.address == ip) {
	  UnisService.nodes.forEach(function(n) {
	    if (n.ports) {
	      n.ports.forEach(function(pref) {
		if (pref.href == p.selfRef) {
		  servs.forEach(function(s) {
		    if (s.runningOn && s.runningOn.href == n.selfRef) {
		      meas.forEach(function(m) {
			if (m.service == s.selfRef) {
			  metas.forEach(function(md) {
			    if (md.parameters.measurement.href == m.selfRef &&
				seen_ets.indexOf(md.eventType) == -1 &&
				Object.keys(ETS_CHART_CONFIG).indexOf(md.eventType) >= 0) {
			      metadatas.push(md);
			      seen_ets.push(md.eventType);
			    }})
			}})
		    }})
		}})
	    }})
	}});
    }
    return metadatas;
  };
  
  function updateDepots() {
    
  };
  
  function createDepot(s) {
    var mds = getMetadata(s);
    var depot = {
      'metadata': mds,
    };
    // get values for each metadata
    mds.forEach(function(md) {
      if ([ETS.used, ETS.free].indexOf(md.eventType) >= 0) {
	UnisService.getDataId(md.id, 1, function(data) {
	  if (Object.prototype.toString.call(data) === '[object Array]') {
	    depot[md.eventType] = parseInt(data.pop()['value'])
	  }
	  else {
	    depot[md.eventType] = parseInt(data[md.id].pop()['value'])
	  }
	})
      }
    });
    service.depots[s.id] = depot;
  };
  
  // depot tracking service waits until UNIS has data
  UnisService.init.then(function() {
    console.log("Depot service initializing...");
    
    UnisService.services.forEach(function(s) {
      if (s.serviceType == "ibp_server") {
	createDepot(s);
      }
    });
  });
  
  return service;
}
