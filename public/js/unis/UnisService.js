/*
 * Unis Service
 * public/js/unis/
 * UnisService.js
 */

function unisService($q, $http, $timeout, SocketService, CommChannel) {
  var ttl_off_limit = 60; // 1 minute
  var ttl_wiggle = 5;  
  var service = {};
  var dataIdCbMap = {};
  
  service.nodes        = [];
  service.ports        = [];
  service.links        = [];
  service.measurements = [];
  service.metadata     = [];
  service.services     = [];

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

  getUniqueByField = function(ary, f) {
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
      name = ((item.accessPoint || "").split("://")[1] || "").split(":")[0] || "" 
    } else if (typeof item.name != 'undefined') {
      name = item.name
    }
    return name;
  };
  
  hasLocationInfo = function(item) {
    return (typeof item.location != 'undefined'
            && typeof item.location.longitude != 'undefined'
            && typeof item.location.latitude != 'undefined'
            && item.location.longitude != 0
            && item.location.latitude != 0)
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
	})}
    });
  };
  
  updateServiceEntry = function(item) {
    var now = Math.round(new Date().getTime() / 1e3) // seconds
    item.ttl = Math.round(((item.ttl + (item.ts / 1e6)) - now));
    
    if (!hasLocationInfo(item)) {
      var url = "http://freegeoip.net/json/" + getServiceName(item);
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
	}).
	error(function(data, status, headers, config) {
	  console.log("Error: ", status);
	})
    }
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
  
  service.getDataId = function(id, n, cb , unName) {
    var qstr = '/api/data/' + id;
    if (!n) {
      n = 300;
    }
    qstr += '?limit=' + n;
    $http.get(qstr).success(function(data) {
      //console.log('HTTP Data Response: ' + data);
      cb(data);
      service.subDataId(id, cb, unName);
    }).error(function(data) {
      console.log('HTTP Data Error: ' + data);
    });
  };

  service.subDataId = function(id, cb,uname) {
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
    var id ;
    if (typeof data != 'object'){
      data = JSON.parse(data);
    };    
    for (var i in data) {
      id = i;
      break;
    };

    //console.log('Incoming data for ' + id + ' : ', data);
    if (id in dataIdCbMap) {
      var map = dataIdCbMap[id];
      for (var i in map) {
        var cb = map[i];
        cb(data);
      }
    }
  });
  
  finish = function() {
    var services = service.services;
    services.forEach(function(s) {
      updateServiceEntry(s)
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
	  // let's not remove 'off' depots yet
	  //services.splice(i, 1);
	}
      }
      //continue timer
      timeout = $timeout(onTimeout, 1000);
    }
    
    // start timer
    var timeout = $timeout(onTimeout, 1000);   
  };
    
  // socket handlers...
  SocketService.on('service_data', function(data) {
    if (typeof data =='string') {
      data = JSON.parse(data);
    }
    console.log('Service data: ', data);
    var services = service.services;

    // always add a new blipp service entry
    if (services.serviceType == "ps:tools:blipp") {
      services.push(data);
      return;
    }

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
  
  // We start here when the service is instantiated
  service.init = $q.all([
    $http.get('/api/nodes', { cache: true}),
    $http.get('/api/ports', { cache: true}),
    $http.get('/api/measurements', { cache: true}),
    $http.get('/api/metadata', { cache: true}),
    $http.get('/api/services', { cache: true})
  ]).then(function(res) {
    service.nodes = getUniqueById(res[0].data);
    service.ports = getUniqueById(res[1].data);
    service.measurements = getUniqueById(res[2].data);
    service.metadata = getUniqueById(res[3].data);
    service.services = getUniqueByField(res[4].data, 'accessPoint');

    SocketService.emit('service_request', {});
    SocketService.emit('node_request', {});
    SocketService.emit('port_request', {});
    SocketService.emit('measurement_request', {});
    SocketService.emit('metadata_request', {});
    
    finish();
  });
    
  return service;
}
