/*
 * Client & UNIS Sockets
 * app/
 * sockets.js
 */

// modules
var WebSocket = require('ws')  , freegeoip = require('node-freegeoip');
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
		var c = registeredClientMap[i];
		var id = c.id , 
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

  var unis_sub = 'ws://dlt.incntre.iu.edu:9000/subscribe/'
  // var unis_sub = 'ws://monitor.incntre.iu.edu:9000/subscribe/'

  var ms_sub = 'ws://dlt.incntre.iu.edu:9001/subscribe/'
  // var ms_sub = 'ws://monitor.incntre.iu.edu:9001/subscribe/'

  // establish client socket
  console.log('Client connected');

  client_socket.on('disconnect', function() {
    console.log('Client disconnected');
  });

  client_socket.on('eodnDownload_request', function(data) {
	  // The id according to which multiple downloads happen
	  var id = data.id ;
	  getAllIpLocationMap(nodeIpArray,function(map){		  
		  var nodeLocations = map;
		  console.log('all fine till here ');
		  client_socket.emit('eodnDownload_Nodes', {data : nodeLocations});
		  var downloadAgent = registeredClientMap[id];
		  if(downloadAgent){
			  var q = downloadAgent;
			  // Push the current socket so that it can get the emitted download info 
			  q.registeredRequestClientArr.push(client_socket);
			  // Send the file info 
			  client_socket.emit('eodnDownload_Info', {name : q.filename , size : q.totalSize , connections : q.connections});
		  } else {
			  client_socket.emit('eodnDownload_Info', {isError : true });
		  };
	  });
  });
  
  // The latest download hashmap 
  client_socket.on('eodnDownload_register', function(data) {
	  var id = data.hashId , 
	  	name = data.filename ,
	  	totalSize = data.totalSize;
	  data.registeredRequestClientArr = [];
	  registeredClientMap[id] = data ;
  });
  
  client_socket.on('eodnDownload_pushData', function(data) {
	  var id =  data.hashId ;
	  var client = registeredClientMap[id];
	  if(client){
		  var arr = client.registeredRequestClientArr || [] ;
		  var time = (new Date()).getTime();
		  rClientsLastProgressMap[id] = time ;
		  // Publish to all sockets in the array
		  var nArr = [] , flag = false;
		  for(var i=0; i < arr.length ; i++) {
			  // push to the sockets which are alive 
			  var sock = arr[i];
			  if(arr[i].connected){		
				  flag = true ;
				  arr[i].emit('eodnDownload_Progress', data);
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
		  client.registeredRequestClientArr = nArr ;
	  } else {
		  // Do some error stuff or fallbaCK
		  client_socket.emit('eodnDownload_fail');
	  }
  });
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
