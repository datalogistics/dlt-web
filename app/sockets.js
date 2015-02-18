/*
 * Client & UNIS Sockets
 * app/
 * sockets.js
 */

// modules
var WebSocket = require('ws')
, freegeoip = require('node-freegeoip')
, fs = require('fs')
, path = require('path')
, http = require('http')
, https = require('https')
, url = require('url')
, cfg = require('../properties')
,_ = require('underscore');


// Clearout unused items every 15 minutes
setInterval(function(){
  var time = (new Date()).getTime();
  for(var i in registeredClientMap){
    var c = registeredClientMap[i] ;
    if(!c || !c.hashId)
      continue ;
    var id = c.hashId,
    lastProgressTime = rClientsLastProgressMap[id]
    lastUsedTime = rClientsLastUsedMap[id];
    // If it has been used in last 5 minutes then keep it or else remove it
    if(!(time - lastProgressTime > 300000 || time - lastUsedTime > 300000)){
      registeredClientMap[id] = undefined ;
    }
  };
},300000);

// Storing all the data in memory -- ya seriously gonna do that - Data manually deleted in 15 minutes
// This map stores the fileData which is used to retrieve it.
var registeredClientMap = {};
var rClientsLastProgressMap = {}
var rClientsLastUsedMap = {};
var rMap = cfg.routeMap;

var socketMap = {};
var resourceMap = {};
  
// export function for listening to the socket
module.exports = function(client) {
  
  function getGenericHandler(resource, emitName){
    var opt = cfg.getHttpOptions({'name': resource});

    function createWebSocket(path, name) {
      for (var i = 0; i < opt.hostArr.length; i++) {
	var proto = "ws";
	var ssl_opts = {};
	if (opt.doSSLArr[i]) {
	  proto = "wss";
	  ssl_opts = {'cert': fs.readFileSync(opt.certArr[i]),
		      'key': fs.readFileSync(opt.keyArr[i])};
	  ssl_opts = _.extend(ssl_opts, cfg.sslOptions);
	}
        var urlstr = url.format({'protocol': proto,
				 'slashes' : true,
				 'hostname': opt.hostArr[i],
				 'port'    : opt.portArr[i],
				 'pathname': "/subscribe/" + path});
        
	console.log("Creating websocket for: " + urlstr);
	
        var socket = new WebSocket(urlstr, ssl_opts);
        socket.on('open', function() {
          //console.log('UNIS socket opened');
        });
        socket.on('message', function(data) {
          console.log('UNIS socket ('+name+'): '+data);        
          data.__source = name;
	  socketMap[path].clients.forEach(function(client) {
            client.emit(emitName, data);
	  });
        });
        socket.on('close', function() {
          //console.log('UNIS: socket closed');
        });
	// save the socket handles
	if (!socketMap[path].sockets) {
	  socketMap[path].sockets = [socket];
	}
	else {
	  socketMap[path].sockets.push(socket);
	}
      }
    }
    
    return function(data) {
      var path = resource;
      if (data && data.id) {
	path = path + '/' + data.id;
      }
      if (!socketMap[path]) {
	socketMap[path] = {'clients': [client]};
	createWebSocket(path, resource);
      }
      else {
	socketMap[path].clients.push(client);
      }
      if (!resourceMap[client.id]) {
	resourceMap[client.id] = [path];
      }
      else {
	if (resourceMap[client.id].indexOf(path) == -1) {
	  resourceMap[client.id].push(path);
	}
      }
      //console.log(socketMap);
      //console.log(resourceMap);
    };
  };
  
  // clean up sockets as necessary when a client disconnects
  client.on('disconnect', function(data) {
    console.log('Client disconnected:', client.conn.remoteAddress);
    if (resourceMap[client.id]) {
      resourceMap[client.id].forEach(function(type) {
	var clients = socketMap[type].clients;
	for (var i = clients.length - 1; i >= 0; i--) {
	  if (client.id == clients[i].id) {
	    clients.splice(i, 1);
	  }
	}
	// close the web socket to UNIS if the last client disconnected
	if (clients.length == 0) {
	  console.log("Last client disconnected, closing sockets for: " + type);
	  socketMap[type].sockets.forEach(function(s) {
	    s.close();
	  });
	  delete socketMap[type];
	}
	return false;
      });
      delete resourceMap[client.id];
    }
  });
  
  // establish client socket
  console.log('Client connected:', client.conn.remoteAddress);
  
  client.on('node_request', getGenericHandler('node','node_data'));
  client.on('service_request', getGenericHandler('service','service_data'));
  client.on('measurement_request',  getGenericHandler('measurement','measurement_data'));
  client.on('metadata_request',  getGenericHandler('metadata','metadata_data'));
  client.on('port_request', getGenericHandler('port','port_data'));
  client.on('link_request', getGenericHandler('link','link_data'));
  client.on('path_request', getGenericHandler('path','path_data'));
  client.on('network_request', getGenericHandler('network','network_data'));
  client.on('domain_request', getGenericHandler('domain','domain_data'));
  client.on('topology_request', getGenericHandler('topology','topology_data'));
  client.on('event_request', getGenericHandler('event','event_data'));
  client.on('data_request', getGenericHandler('data','data_data'));
  
  // All the weird ones
  client.on('eodnDownload_request', function(data) {
    // The id according to which multiple downloads happen
    var id = data.id ;
    getAllIpLocationMap(nodeIpArray,function(map){
      var nodeLocations = map;
      console.log('all fine till here ');
      client.emit('eodnDownload_Nodes', {data : nodeLocations});
      // AddNewConnection
      addNewConn(client, id);
    });
  });
  
  client.on("eodnDownload_clear",function(data){
    var id = data.hashId ;
    var serve = registeredClientMap[id];
    var messageName = 'eodnDownload_clear' ,
    dataToBeSent = data;
    emitDataToAllConnected(serve , messageName , dataToBeSent);
    // Kill it - will be auto gc'd
    registeredClientMap[id] = undefined ;
  });
  
  // The latest download hashmap
  client.on('eodnDownload_register', function(data) {
    var id = data.hashId ,
    name = data.filename ,
    totalSize = data.totalSize, conn = data.connections;
    console.log("registered new node ",data);
    console.log(registeredClientMap);
    var old = registeredClientMap[id] || {};
    data.registeredRequestClientArr = old.registeredRequestClientArr || [];
    //client.emit('eodnDownload_Info', {name : q.filename , size : q.totalSize , connections : q.connections});
    data.exists = true ;
    registeredClientMap[id] = data ;
    var arr = data.registeredRequestClientArr || [] ;
    console.log("already regdd cleintssssssssssssss ",arr.length);
    emitDataToAllConnected(registeredClientMap[id], 'eodnDownload_Info',{id : id , name : name , size : totalSize , connections : conn});
  });
  
  client.on('eodnDownload_pushData', function(data) {
    var id =  data.hashId ;
    var serve = registeredClientMap[id];
    var messageName = 'eodnDownload_Progress' ,
    dataToBeSent = data;
    dataToBeSent.totalSize = serve.totalSize;
    if(serve){
      emitDataToAllConnected(serve , messageName , dataToBeSent);
    } else {
      // Do some error stuff or fallbaCK
      client.emit('eodnDownload_fail');
    }
  });
}

function addNewConn(client, id){
  var downloadAgent = registeredClientMap[id];
  if(downloadAgent && downloadAgent.exists){
    var q = downloadAgent;
    // Push the current socket so that it can get the emitted download info
    q.registeredRequestClientArr.push(client);
    // Go bonkers and emit all old messages
    var arr = q._emitPipe || [];
    console.log('pushing all known messages' , arr);
    for ( var i = 0 ; i < arr.length ; i++){
      client.emit(arr[i].name , arr[i].data);
    }
  } else {
    // Send an error for now , then store it for later use anyway
    client.emit('eodnDownload_Info', {isError : true });
    registeredClientMap[id] = registeredClientMap[id] || {} ;
    var arr = registeredClientMap[id].registeredRequestClientArr || [];
    arr.push(client);
    registeredClientMap[id].exists = false ;
    registeredClientMap[id].registeredRequestClientArr = arr ;
    console.log("added ......................... " ,registeredClientMap );
  };
}

function emitDataToAllConnected(serve , messageName , dataToBeSent) {
  if(serve){
    // Store all the emitted data to use for future connections
    serve._emitPipe = serve._emitPipe || [] ;
    serve._emitPipe.push({name : messageName , data : dataToBeSent});
    var arr = serve.registeredRequestClientArr || [] ;
    var time = (new Date()).getTime();
    var id = serve.hashId || serve.id;
    rClientsLastProgressMap[id] = time ;
    // Publish to all sockets in the array
    var nArr = [] , flag = false;
    for(var i=0; i < arr.length ; i++) {
      // push to the sockets which are alive
      var sock = arr[i];
      if(arr[i].connected){
	flag = true ;
	arr[i].emit(messageName, dataToBeSent);
	//{data : { ip : "24.1.111.131" , progress : 5}});
      }
      if(arr[i].connected || arr[i].connecting){
	// add to array
	nArr.push(arr[i]);
      }
    }
    if(flag) {
      rClientsLastUsedMap[id] = time ;
    }
    // Killed disconnected nodes
    serve.registeredRequestClientArr = nArr ;
  }
}

var _nodeLocationMap = {};
function getAllIpLocationMap(array , cb){
  array = array || [];
  var locMap = {};
  var i =0;
  function done(){
    i++;
    if(i >= array.length - 1){
      cb(locMap);
      // Kil it
      i = -111111;
    }
  }
  array.forEach(function(val) {
    if(_nodeLocationMap[val]){
      locMap[val] = _nodeLocationMap[val];
      done();
    } else
      freegeoip.getLocation(val, function(err, obj) {
	if(err){
	  done();
	  return ;
	}
	locMap[val] = _nodeLocationMap[val] = [obj.longitude , obj.latitude];
	done();
      });
  });  
}
