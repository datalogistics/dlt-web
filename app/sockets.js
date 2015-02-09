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
},300000);

// Storing all the data in memory -- ya seriously gonna do that - Data manually deleted in 15 minutes
// This map stores the fileData which is used to retrieve it.
var registeredClientMap = {};
var rClientsLastProgressMap = {} ,
	rClientsLastUsedMap = {};
var rMap = cfg.routeMap;

// export function for listening to the socket
module.exports = function (client_socket) {
    var socket_ids = [];
    var sockets = [];
    
    // Create all sockets required   
    // The generic api handler which just takes data form UNIS and returns it   
    function getGenericHandler(path, emitName, args){
	var opt = cfg.getHttpOptions({'name': path});
	var id_path = "";

	if (args && args.id) {
	    id_path = "/" + args.id;
	}

	if (args && args.flush) {
	    console.log("Closing existing data sockets");
	    for(var i = 0; i < sockets.length; i++) {
		dataSocket = sockets[i];
		dataSocket.close();
	    }
	}

	return function(data) {
            for (var i = 0 ; i < opt.hostArr.length ; i++) {
                var name = path;
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
					 'pathname': "/subscribe/" + path + id_path});
                
		console.log("Creating websocket for: " + urlstr);

                var socket = new WebSocket(urlstr, ssl_opts);

		if (path == "data") {
		    sockets.push(socket);
		}

                socket.on('open', function() {
                    //console.log('UNIS socket opened');
                });
                socket.on('message', function(data) {
                    console.log('UNIS socket data: ' + data);        
                    data.__source = name ;
                    client_socket.emit(emitName, data);
                });
                socket.on('close', function() {
                    //console.log('UNIS: socket closed');
                });
            };
        };
    };
    
    // establish client socket
    console.log('Client connected');

    client_socket.on('disconnect', function() {
        console.log('Client disconnected');
    });

    // Uses the generic api handler which just takes data form UNIS and returns it   
    // Copy pasting here to make things modifiable without me writing code
    client_socket.on('node_request', getGenericHandler('node','node_data'));
    client_socket.on('service_request', getGenericHandler('service','service_data'));
    client_socket.on('measurement_request',  getGenericHandler('measurement','measurement_data'));
    client_socket.on('metadata_request',  getGenericHandler('metadata','metadata_data'));
    client_socket.on('port_request', getGenericHandler('port','port_data'));
    client_socket.on('link_request', getGenericHandler('link','link_data'));
    client_socket.on('path_request', getGenericHandler('path','path_data'));
    client_socket.on('network_request', getGenericHandler('network','network_data'));
    client_socket.on('domain_request', getGenericHandler('domain','domain_data'));
    client_socket.on('topology_request', getGenericHandler('topology','topology_data'));
    client_socket.on('event_request', getGenericHandler('event','event_data'));
    client_socket.on('data_request', function (data) { getGenericHandler('data', 'data_data',
									 {'id': data.id,
									  'flush': true
									 })(data)});
    
    // All the weird ones
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
