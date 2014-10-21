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
, url = require('url');

//Can later create this array with
// All registered depots  - Need a way to get all possible depots 
var nodeIpArray = ["24.1.111.131" , // bloomington
                   "173.194.123.46", // google
                   "128.83.40.146" , // UT austin
                   "128.2.42.52" , // CMU
                   "130.207.244.165" // GA Tech
                   ];
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
},900000)

// Storing all the data in memory -- ya seriously gonna do that - Data manually deleted in 15 minutes
// This map stores the fileData which is used to retrieve it.
var registeredClientMap = {};
var rClientsLastProgressMap = {} ,
	rClientsLastUsedMap = {};
  
// export function for listening to the socket
module.exports = function (client_socket) {
  var unis_sub = 'wss://dlt.incntre.iu.edu:9000/subscribe/'
  var ms_sub = 'wss://dlt.incntre.iu.edu:9001/subscribe/'
  var ssl_opts = {'cert': fs.readFileSync('./dlt-client.pem'),
		  'key': fs.readFileSync('./dlt-client.pem'),
		  rejectUnauthorized: false}
  var socket_ids = [];

  // establish client socket
  console.log('Client connected');

  client_socket.on('disconnect', function() {
    console.log('Client disconnected');
  });

  client_socket.on('node_request', function(data) {
    // Create socket to listen for updates on nodes
    var nodeSocket = new WebSocket(unis_sub + 'node', ssl_opts);

    nodeSocket.on('open', function(event) {
      console.log('UNIS: Node socket opened');
    });

    nodeSocket.on('message', function(data) {
      console.log('UNIS: node_data: ' + data);
      client_socket.emit('node_data', data);
    });

    nodeSocket.on('close', function(event) {
      console.log('UNIS: Node socket closed');
    });
  });

  client_socket.on('service_request', function(data) {
    // Create socket to listen for updates on services
    var serviceSocket = new WebSocket(unis_sub + 'service', ssl_opts);

    serviceSocket.on('open', function(event) {
      console.log('UNIS: Service socket opened');
    });

    serviceSocket.on('message', function(data) {
      console.log('UNIS: service_data: ' + data);
      client_socket.emit('service_data', data);
    });

    serviceSocket.on('close', function(event) {
      console.log('UNIS: Service socket closed');
    });
  });

  client_socket.on('measurement_request', function(data) {
    // Create socket to listen for updates on measurements
    var measurementSocket = new WebSocket(unis_sub + 'measurement', ssl_opts);

    measurementSocket.on('open', function(event) {
      console.log('UNIS: Measurement socket opened');
    });

    measurementSocket.on('message', function(data) {
      console.log('UNIS: measurement_data: ' + data);
      client_socket.emit('measurement_data', data);
    });

    measurementSocket.on('close', function(event) {
      console.log('UNIS: Measurement socket closed');
    });
  });

  client_socket.on('metadata_request', function(data) {
    // Create socket to listen for updates on metadata
    var metadataSocket = new WebSocket(unis_sub + 'metadata', ssl_opts);

    metadataSocket.on('open', function(event) {
      console.log('UNIS: Metadata socket opened');
    });

    metadataSocket.on('message', function(data) {
      console.log('UNIS: metadata_data: ' + data);
      client_socket.emit('metadata_data', data);
    });

    metadataSocket.on('close', function(event) {
      console.log('UNIS: Metadata socket closed');
    });
  });

  client_socket.on('data_id_request', function(data) {
    console.log('UNIS: Data ID requested: ' + data.id);

    if(socket_ids.indexOf(data.id) == -1) {
      // Create socket to listen for updates on data
      var dataSocket = new WebSocket(ms_sub + 'data/' + data.id, ssl_opts);

      socket_ids.push(data.id);
    }

    dataSocket.on('open', function(event) {
      console.log('UNIS: Data ID socket opened for: ' + data.id);
    });

    dataSocket.on('message', function(data) {
      console.log('UNIS: data_id_data: ' + data);
      client_socket.emit('data_id_data', data);
    });

    dataSocket.on('close', function(event) {
      console.log('UNIS: Data ID socket closed');
    });
  });

  client_socket.on('data_request', function(data) {
    console.log('UNIS: Data requested: ' + data);

    // Create socket to listen for updates on data
    var dataSocket = new WebSocket(ms_sub + 'data', ssl_opts);

    dataSocket.on('open', function(event) {
      console.log('UNIS: Data socket opened');
    });

    dataSocket.on('message', function(data) {
      console.log('UNIS: data_data: ' + data);
      client_socket.emit('data_data', data);
    });

    dataSocket.on('close', function(event) {
      console.log('UNIS: Data socket closed');
    });
  });

  client_socket.on('port_request', function(data) {
    // Create socket to listen for updates on port
    var portSocket = new WebSocket(unis_sub + 'port', ssl_opts);

    portSocket.on('open', function(event) {
      console.log('UNIS: Port socket opened');
    });

    portSocket.on('message', function(data) {
      console.log('UNIS: port_data: ' + data);
      client_socket.emit('port_data', data);
    });

    portSocket.on('close', function(event) {
      console.log('UNIS: Port socket closed');
    });
  });

  client_socket.on('link_request', function(data) {
    // Create socket to listen for updates on link
    var linkSocket = new WebSocket(unis_sub + 'link');

    linkSocket.on('open', function(event) {
      console.log('UNIS: Link socket opened');
    });

    linkSocket.on('message', function(data) {
      console.log('UNIS: link_data: ' + data);
      client_socket.emit('link_data', data);
    });

    linkSocket.on('close', function(event) {
      console.log('UNIS: Link socket closed');
    });
  });

  client_socket.on('path_request', function(data) {
    // Create socket to listen for updates on path
    var pathSocket = new WebSocket(unis_sub + 'path');

    pathSocket.on('open', function(event) {
      console.log('UNIS: Path socket opened');
    });

    pathSocket.on('message', function(data) {
      console.log('UNIS: path_data: ' + data);
      client_socket.emit('path_data', data);
    });

    pathSocket.on('close', function(event) {
      console.log('UNIS: Path socket closed');
    });
  });

  client_socket.on('network_request', function(data) {
    // Create socket to listen for updates on network
    var networkSocket = new WebSocket(unis_sub + 'network');

    networkSocket.on('open', function(event) {
      console.log('UNIS: Network socket opened');
    });

    networkSocket.on('message', function(data) {
      console.log('UNIS: network_data: ' + data);
      client_socket.emit('network_data', data);
    });

    networkSocket.on('close', function(event) {
      console.log('UNIS: Network socket closed');
    });
  });

  client_socket.on('domain_request', function(data) {
    // Create socket to listen for updates on domain
    var domainSocket = new WebSocket(unis_sub + 'domain');

    domainSocket.on('open', function(event) {
      console.log('UNIS: Domain socket opened');
    });

    domainSocket.on('message', function(data) {
      console.log('UNIS: domain_data: ' + data);
      client_socket.emit('domain_data', data);
    });

    domainSocket.on('close', function(event) {
      console.log('UNIS: Domain socket closed');
    });
  });

  client_socket.on('topology_request', function(data) {
    // Create socket to listen for updates on topology
    var topologySocket = new WebSocket(unis_sub + 'topology');

    topologySocket.on('open', function(event) {
      console.log('UNIS: Topology socket opened');
    });

    topologySocket.on('message', function(data) {
      console.log('UNIS: topology_data: ' + data);
      client_socket.emit('topology_data', data);
    });

    topologySocket.on('close', function(event) {
      console.log('UNIS: Topology socket closed');
    });
  });

  client_socket.on('event_request', function(data) {
    // Create socket to listen for updates on event
    var eventSocket = new WebSocket(unis_sub + 'event');

    eventSocket.on('open', function(event) {
      console.log('UNIS: Event socket opened');
    });

    eventSocket.on('message', function(data) {
      console.log('UNIS: event_data: ' + data);
      client_socket.emit('event_data', data);
    });

    eventSocket.on('close', function(event) {
      console.log('UNIS: Event socket closed');
    });
  });
  client_socket.on('eodnDownload_request', function(data) {
	  // The id according to which multiple downloads happen
	  var id = data.id ;
	  getAllIpLocationMap(nodeIpArray,function(map){		  
		  var nodeLocations = map;
		  console.log('all fine till here ');
		  client_socket.emit('eodnDownload_Nodes', {data : nodeLocations});
		  // AddNewConnection
		  addNewConn(client_socket , id);
	  });
  });
  
  client_socket.on("eodnDownload_clear",function(data){
	var id = data.hashId ;
	var serve = registeredClientMap[id];
	var messageName = 'eodnDownload_clear' ,
  	  dataToBeSent = data;
	emitDataToAllConnected(serve , messageName , dataToBeSent);
	// Kill it - will be auto gc'd 
	registeredClientMap[id] = undefined ;
  });
  
  // The latest download hashmap 
  client_socket.on('eodnDownload_register', function(data) {
	  var id = data.hashId , 
	  	name = data.filename ,
	  	totalSize = data.totalSize, conn = data.connections;	   
	  console.log("registered new node ",data);
	  console.log(registeredClientMap);
	  var old = registeredClientMap[id] || {};
	  data.registeredRequestClientArr = old.registeredRequestClientArr || [];
	  //client_socket.emit('eodnDownload_Info', {name : q.filename , size : q.totalSize , connections : q.connections});
	  data.exists = true ;
	  registeredClientMap[id] = data ;	  
	  var arr = data.registeredRequestClientArr || [] ;
	  console.log("already regdd cleintssssssssssssss ",arr.length);
	  emitDataToAllConnected(registeredClientMap[id], 'eodnDownload_Info',{id : id , name : name , size : totalSize , connections : conn});
  });
  
  client_socket.on('eodnDownload_pushData', function(data) {
	  var id =  data.hashId ;
	  var serve = registeredClientMap[id];
	  var messageName = 'eodnDownload_Progress' ,
	  	  dataToBeSent = data;
	  dataToBeSent.totalSize = serve.totalSize;
	  if(serve){
		  emitDataToAllConnected(serve , messageName , dataToBeSent);	  
	  } else {
		  // Do some error stuff or fallbaCK
		  client_socket.emit('eodnDownload_fail');
	  }
	  });
};

function addNewConn(client_socket , id){
	  var downloadAgent = registeredClientMap[id];		  
	  if(downloadAgent && downloadAgent.exists){
		  var q = downloadAgent;
		  // Push the current socket so that it can get the emitted download info 
		  q.registeredRequestClientArr.push(client_socket);
		  // Go bonkers and emit all old messages 
		  var arr = q._emitPipe || [];
		  console.log('pushing all known messages' , arr);
		  for ( var i = 0 ; i < arr.length ; i++){
			  client_socket.emit(arr[i].name , arr[i].data);
		  }
	  } else {
		  // Send an error for now , then store it for later use anyway 		  
		  client_socket.emit('eodnDownload_Info', {isError : true });
		  registeredClientMap[id] = registeredClientMap[id] || {} ;
		  var arr = registeredClientMap[id].registeredRequestClientArr || [];
		  arr.push(client_socket);
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
};
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
