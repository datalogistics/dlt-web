/*
 * Unis Service
 * public/js/unis/
 * UnisService.js
 */

function unisService($q, $http, $timeout, SocketService) {
  
  var service = {};
  
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

	  service.ports.forEach(function(p) {
	    if (typeof p.properties.ipv4 != 'undefined'
		&& typeof item.listeners != 'undefined') {
	      item.listeners.forEach(function(l) {
		if (l.tcp.split("/")[0] == p.properties.ipv4.address)
		  item.location.institution = p.nodeRef.replace(/(.*)(domain=)(.*):.*$/, "$3");
	      })}
	  });
	}).
	error(function(data, status, headers, config) {
	  console.log("Error: ", status);
	})
    }
  };

  // Update services on socket
  SocketService.on('service_data', function(data) {
    if (typeof data =='string') {
      data = JSON.parse(data);
    }
    console.log('Socket Service Request: ', data);
    var services = service.services;
    var found = false;
    // search for duplicate services
    for(var i = 0; services.length; i++) {      
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
      services.push(data);
    }
  });

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
  
  service.getDataId = function(id, cb) {
    $http.get('/api/data/' + id).success(function(data) {
      //console.log('HTTP Data Response: ' + data);
      cb(data);
      SocketService.emit('data_request', {'id': id});
    }).error(function(data) {
      console.log('HTTP Data Error: ' + data);
    });
    
    SocketService.on('data_data', function(data) {
      console.log('Incoming data for ' + id + ' : ', data);
      cb(data);
    });
  };
  

  // We start here when the service is instantiated
  var ttl_wiggle = -5;
  finish = function() {
    var services = service.services;
    services.forEach(function(s) {
      updateServiceEntry(s)
    });
    
    // set timer value
    onTimeout = function() {
      for(var i = 0; i < services.length; i++) {
	if(services[i].ttl == 0) {
	  services[i].status = 'Unknown';
	} else if(services[i].ttl < ttl_wiggle) {
	  services[i].status = 'OFF';
	} else {
	  services[i].status = 'ON';
	  services[i].ttl--;
	}
      }
      //continue timer
      timeout = $timeout(onTimeout, 1000);
    }
    
    // start timer
    var timeout = $timeout(onTimeout, 1000);   
  };
  
  $q.all([
    $http.get('/api/nodes', { cache: true}),
    $http.get('/api/ports', { cache: true}),
    $http.get('/api/measurements', { cache: true}),
    $http.get('/api/metadata', { cache: true}),
    $http.get('/api/services', { cache: true})
  ]).then(function(res) {
    service.nodes = res[0].data;
    service.ports = res[1].data;
    service.measurements = res[2].data;
    service.metadata = res[3].data;
    service.services = getUniqueById(res[4].data);
    
    SocketService.emit('node_request', {});
    SocketService.emit('port_request', {});
    SocketService.emit('measurement_request', {});
    SocketService.emit('metadata_request', {});
    SocketService.emit('service_request', {});    
    
    finish();
  });
  
  return service;
}