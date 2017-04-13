/*
 * Unis Service
 * public/js/unis/
 * UnisService.js
 */

function unisService($q, $http, $timeout, SocketService, CommChannel) {
  var ttl_off_limit = 600; // 10 minutes
  var ttl_wiggle = 5;  
  var service = {};
  var dataIdCbMap = {};
  
  service.topologies   = [];
  service.domains      = [];
  service.nodes        = [];
  service.ports        = [];
  service.links        = [];
  service.measurements = [];
  service.metadata     = [];
  service.services     = [];
  service.paths        = [];

  getUniqueById = function(ary) {
    var curr = [];
    var ret = [];
    for(var i = 0; i < ary.length; i++) {
      if(curr.indexOf(ary[i].id) == -1) {
	curr.push(ary[i].id);
	ret.push(ary[i]);
      }
    }
    return ret;
  };

  var getUniqueByField = function(ary, f) {
    var curr = [];
    var ret = [];
    for(var i = 0; i < ary.length; i++) {
      if(curr.indexOf(ary[i][f]) == -1) {
	curr.push(ary[i][f]);
	ret.push(ary[i]);
      }
    }
    return ret;
  };
  
  getServiceName = function(item) {
    var name;
    if (typeof item.accessPoint != 'undefined') {
      name = ((item.accessPoint || "").split("://")[1] || "").split(":")[0] || "" ;
    } else if (typeof item.name != 'undefined') {
      name = item.name;
    }
    return name;
  };

  
  
  hasLocationInfo = function(item) {
    return (typeof item.location != 'undefined'
            && typeof item.location.longitude != 'undefined'
            && typeof item.location.latitude != 'undefined'
            && item.location.longitude != 0
            && item.location.city
            && item.location.latitude != 0);
  };
  
  getInstitutionName = function(item) {
    service.ports.forEach(function(p) {
      if (typeof p.properties != 'undefined'
	  && typeof p.properties.ipv4 != 'undefined'
	  && typeof item.listeners != 'undefined') {
	item.listeners.forEach(function(l) {
	  if (l.tcp.split("/")[0] == p.properties.ipv4.address
	      && !item.location.institution)
	    item.location.institution = p.nodeRef.replace(/(.*)(domain=)(.*):.*$/, "$3");
	});
      };
    });
  };
  
  updateServiceEntry = function(item) {
    var now = Math.round(new Date().getTime() / 1e3) // seconds
    item.ttl = Math.round(((item.ttl + (item.ts / 1e6)) - now));
    var d = $q.defer();
    if (!hasLocationInfo(item)) {
      var url = DLT_PROPS.FreeGeoIpUrl + getServiceName(item);
      $http.get(url).
	success(function(data, status, headers, config) {
	  item.location = {
	    'latitude': data.latitude,
	    'longitude': data.longitude,
	    'state': data.region_code,
	    'country': data.country_code,
	    'zipcode': data.zip_code,
	    'city': data.city
	  };
	  getInstitutionName(item);
          d.resolve();
	}).
	error(function(data, status, headers, config) {
	  console.log("Error: ", status);
          d.resolve();
	});
    } else {
      d.resolve();
    }
    // send a resolve promise anyway
    return d.promise;
  };

  service.getMetadataId = function(id, cb) {
    $http.get('/api/metadata/' + id)
      .success(function(data) {
        //console.log('Metadata Request: ' + data);
        cb(data);
      })
      .error(function(data) {
        console.log('Metadata Error: ' + data);
      });
  };
  
  // Note: getting also invokes subscription
  service.getDataId = function(id, n, cb, uname) {
    var qstr = '/api/data/' + id;
    if (!n) {
      n = 300;
    }
    qstr += '?limit=' + n;
    $http.get(qstr).success(function(data) {
      //console.log('HTTP Data Response: ' + data);
      cb(data);
      service.subDataId(id, cb, uname);
    }).error(function(data) {
      console.log('HTTP Data Error: ' + data);
    });
  };

  service.subDataId = function(id, cb, uname) {
    uname = uname || "__nvrDelete"+ Math.random();
    if (id in dataIdCbMap) {
      dataIdCbMap[id][uname] = cb;      
    }
    else {
      //console.log("emitting data request for: ", id, cb);
      SocketService.emit('data_request', {'id': id});
      var obj = {};
      obj[uname] = cb;
      dataIdCbMap[id] = obj;      
    }
  };
  
  service.unsubDataId = function(id,uname) {
    if (uname) {
      var map = dataIdCbMap[id];
      if (map) {
        delete map[uname];
      }
      // Sticking to object keys as general assumption is that map counter cannot be much greater than 38-380
      if (Object.keys(map).length == 0) {
        // Unsubscribe the data id
        SocketService.emit('data_request', {'id': id , 'disconnect' : true});
      }
    }
  };

  SocketService.on('data_data', function(data) {
    var id;
    if (typeof data != 'object'){
      data = JSON.parse(data);
    };
    for (var id in data) {
      //console.log('Incoming data for ' + id + ' : ', data[id]);
      if (id in dataIdCbMap) {
	var map = dataIdCbMap[id];
	for (var i in map) {
          var cb = map[i];
          cb(data[id]);
	}
      }
    };
    // if ("id" in data) {
    //   id = data['id'];
    //   //console.log('Incoming data for ' + id + ' : ', data);
    //   if (id in dataIdCbMap) {
    // 	var map = dataIdCbMap[id];
    // 	for (var i in map) {
    //       var cb = map[i];
    //       cb(data['data']);
    // 	}
    //   }
    // }
  });
  
  finish = function() {
    var services = service.services;
    // TODO: sanitize further
    for(var i = services.length-1; i >= 0; i--) {
      if (typeof services[i].name == 'undefined') {
	// remove any rogue entries
	services.splice(i, 1);
      }
    }
    
    var prom = [] ;
    services.forEach(function(s) {
      prom.push(updateServiceEntry(s));
      // save the initial ts
      s.firstSeen = s.ts;
    });
    
    // set timer value
    onTimeout = function() {
      for(var i = services.length-1; i >= 0; i--) {
	if(services[i].ttl <= 0 && services[i].ttl >= -ttl_wiggle) {
	  services[i].status = 'Unknown';
	} else if(services[i].ttl < -ttl_wiggle) {
	  services[i].status = 'OFF';
	} else {
	  services[i].status = 'ON';
	}
	services[i].ttl--;
	if (services[i].ttl < -ttl_off_limit) {
	  // remove 'off' services
	  services.splice(i, 1);
	}
      }
      //continue timer
      timeout = $timeout(onTimeout, 1000);
    }
        
    return $q.all(prom).then(function() {
      // start timer
      var timeout = $timeout(onTimeout, 1000);
    });
  };
    
  // socket handlers...
  SocketService.on('service_data', function(data) {
    if (typeof data =='string') {
      data = JSON.parse(data);
    }
    console.log('Service data: ', data);
    var services = service.services;

    var found = false;
    // search for duplicate services
    for(var i = 0; i < services.length; i++) {      
      if(services[i].accessPoint == data.accessPoint) {
        // just update the ttl and ts with the new value, saving our stored info
        services[i].ttl = data.ttl;
        services[i].ts = data.ts;
        found = true;
        break;
      }
    }

    if (!found) {
      updateServiceEntry(data);
      data.firstSeen = data.ts;
      services.push(data);
      CommChannel.newData('new_service', data);
    }
  });

  SocketService.on('measurement_data', function(data) {
    if (typeof data =='string') {
      data = JSON.parse(data);
    }
    //console.log('Measurement data: ', data);
    service.measurements.push(data);
  });

  SocketService.on('metadata_data', function(data) {
    if (typeof data =='string') {
      data = JSON.parse(data);
    }
    //console.log('Metadata data: ', data);
    service.metadata.push(data);
    CommChannel.newData('new_metadata', data);
  });

  SocketService.on('node_data', function(data) {
    if (typeof data =='string') {
      data = JSON.parse(data);
    }
    console.log('Node data: ', data);
    service.nodes.push(data);
  });

  SocketService.on('port_data', function(data) {
    if (typeof data =='string') {
      data = JSON.parse(data);
    }
    console.log('Port data: ', data);
    service.ports.push(data);
    CommChannel.newData('new_port', data);
  });
  
  SocketService.on('path_data', function(data) {
    if (typeof data =='string') {data = JSON.parse(data);}

    service.paths = service.paths.filter(path => (path.id != data.id))
    service.paths.push(data)

    CommChannel.newData('path_data', data);
  });

  
  // We start here when the service is instantiated
  function makeMap(arr,key,isUnescape) {
    var get = function (model, path, def) {
      path = path || '';
      model = model || {};
      def = typeof def === 'undefined' ? '' : def;
      var parts = path.split('.');
      if (parts.length > 1 && typeof model[parts[0]] === 'object') {
	return get(model[parts[0]], parts.splice(1).join('.'), def);
      } else {
	return model[parts[0]] || def;
      }
    };
    var map = {};
    (arr||[]).forEach(function(x) {
      var val = get(x,key);
      if (isUnescape)
	val = unescape(val);
      if (!map[val])
	map[val] = [];
      map[val].push(x);
    });
    return map;
  }
  var ptime_usec = 3600*1e6;
  var now_usec = Math.round(new Date().getTime() * 1e3);
  var init_filter = '?ts=gt='+(now_usec-ptime_usec);
  var initServicePromise;
  service.init = function() {
    initServicePromise = initServicePromise || $q.all([
      $http.get('/api/topologies', { cache: true}),
      $http.get('/api/domains', { cache: true}),
      $http.get('/api/nodes'+init_filter, { cache: true}),
      $http.get('/api/ports'+init_filter, { cache: true}),
      $http.get('/api/links'+init_filter, { cache: true}),
      $http.get('/api/paths'+init_filter, { cache: true}),
      $http.get('/api/measurements'+init_filter, { cache: true}),
      $http.get('/api/metadata'+init_filter, { cache: true}),
      $http.get('/api/services'+init_filter, { cache: true})
    ]).then(function(res) {
      service.topologies = getUniqueById(res[0].data);
      service.domains = getUniqueById(res[1].data);
      service.nodes = getUniqueById(res[2].data);
      service.ports = getUniqueById(res[3].data);
      service.links = getUniqueById(res[4].data);
      service.paths = getUniqueById(res[5].data);
      service.measurements = getUniqueById(res[6].data);
      service.metadata = getUniqueById(res[7].data);
      service.services = getUniqueById(res[8].data);

      service.nodeSelfRefMap = makeMap(service.nodes,"selfRef");
      service.portsSelfRefMap = makeMap(service.ports,"selfRef");
      service.portsIpMap = makeMap(service.ports,"properties.ipv4.address");
      //service.nodesPrefHrefMap = makeMap(service.nodes,"ports.pref.href");
      service.servicesRunonMap = makeMap(service.services,"runningOn.href",true);
      service.measServMap = makeMap(service.measurements,"service",true);
      service.metaMap = makeMap(service.metadata,"parameters.measurement.href",true);
      
      SocketService.emit('service_request', {});
      SocketService.emit('domain_request', {});
      SocketService.emit('node_request', {});
      SocketService.emit('port_request', {});
      SocketService.emit('link_request', {});
      SocketService.emit('path_request', {});
      SocketService.emit('measurement_request', {});
      SocketService.emit('metadata_request', {});
      return finish();
    });
    return initServicePromise;
  };
  var getVersionUrlMap = {};
  service.getVersionByUrl = function(url,fromCache) {
    if (fromCache && url in getVersionUrlMap) {
      return $q.when(getVersionUrlMap[url]);
    } 
    return $http({
      method : 'get',
      url : '/api/getVersion',
      params: { url : url }
    }).then(function(data) {
      getVersionUrlMap[url] = data;
      return data;
    });
  };
  service.getVersionByHost = function(host,port) {
    return $http.get('/api/getVersion',{
      params : { host : host,port  :port }
    });
  };

  service.getMostRecent = function(items) {
    var recent = {}
    items.forEach(function(e) {
      var prev = recent[e.id] || e
      if (prev.ts && e.ts && e.ts > prev.ts) {prev = e}
      recent[e.id] = e
    })
    return Object.keys(recent).map(k => recent[k])
  }

  return service;
}
