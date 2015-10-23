/*
 * Rest Services for BLipp
 * public/js/unis/
 * BlippService.js
 */

function blippService($http, UnisService, CommChannel) {
  var service = {};
  
  // blipps is a map of service IDs
  service.blipps = {};
  
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

    for(var i = 0; i < meas.length; i++) {
      if (unescape(meas[i].service) == unescape(s.selfRef)) {
	var m = meas[i];
	metas.forEach(function(md) {
	  if (unescape(md.parameters.measurement.href) == unescape(m.selfRef)) {
	    addIfNew(md, metadatas);
	  }
	});
      }
    }

    var ret = [];
    for (var key in metadatas) {
      ret.push(metadatas[key])
    }

    return ret
  };
  
  function createBlipp(s) {
    var mds = getMetadata(s);
    var blipp = {
      'metadata': mds,
      'service': s
    };
    service.blipps[s.id] = blipp;
    // save a reference to the blipp object in the service entry
    s.sref = blipp;
  };
  
  // BLIPP tracking service waits until UNIS has data
  UnisService.init().then(function() {
    console.log("BLIPP service initializing...");
    
    UnisService.services.forEach(function(s) {
      if (s.serviceType == "ps:tools:blipp") {
	createBlipp(s);
      }
    });
  });

  CommChannel.onNewData('new_service', function(s) {
    if (s.serviceType == "ps:tools:blipp") {
      createBlipp(s);
    }
  });

  return service;
}
