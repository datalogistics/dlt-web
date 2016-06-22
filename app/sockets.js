// =============================================================================
//  Data Logistics Toolkit (dlt-web)
//
//  Copyright (c) 2015-2016, Trustees of Indiana University,
//  All rights reserved.
//
//  This software may be modified and distributed under the terms of the BSD
//  license.  See the COPYING file for details.
//
//  This software was created at the Indiana University Center for Research in
//  Extreme Scale Technologies (CREST).
// =============================================================================
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
, querystring = require('querystring')
, cfg = require('../properties')
, q = require('q')
,_ = require('underscore');
var resourceHelper = require('./resourceHelper');
var getOptions = resourceHelper.getOptions;
var getHttpOptions = resourceHelper.getHttpOptions;

WebSocket.super_.defaultMaxListeners = 0;

// Storing all the data in memory -- ya seriously gonna do that - Data manually deleted in 15 minutes
// This map stores the fileData which is used to retrieve it.
var rMap = cfg.routeMap;

var socketMap = {};
var resourceMap = {};
// A map of maps from path to client
var pathIdObj = (function() {
  // Store the map of maps used to register client for each path , each id
  var pmap = {};
  // Store the map of maps from path to client Id to array of pmap leaf obj
  var clmap = {};
  return {
    getAllIds : function(path) {
      var pm = pmap[path] = pmap[path] || {};
      return pm;
    },
    isRegId : function(path , id) {
      var pm = pmap[path] = pmap[path] || {};
      var im = pm[id] || {};
      return im.__count__ > 0 ? true : false; // Just more verbose
    },
    isClientOnPath : function(clientId , path){
      clmap[path] = clmap[path] || {};
      return (clmap[path][clientId] || []).length > 0 ? true : false;
    },
    isRegClient : function (clientId,path,id) {
      var pm = pmap[path] = pmap[path] || {};
      var im = pm[id] || {};
      return im[clientId]? true : false;
    },
    regClient : function (clientId,path,id) {
      // Add the client id to the map
      var pm = pmap[path] = pmap[path] || {};
      var im = pm[id] || {};
      pm[id] = im;
      im[clientId] = true;
      // Should not conflict with client id - risking for simplicity
      im.__id__ = id;
      im.__count__  = im.__count__ || 0;
      im.__count__++;
      
      clmap[path] = clmap[path] || {};
      clmap[path][clientId] = clmap[path][clientId] || [];
      clmap[path][clientId].push(im);
    },
    // Removes all subscribed id list - used to clear on socket error 
    unregisterAllIds : function(path) {
      if (pmap[path])
	pmap[path] = {};
    },
    unregisterId : function(clientId , path,id) {
      var arr = (clmap[path]|| {})[clientId] || [];
      // TODO use a map to make O(1) 
      for (var i=0; i < arr.length;i++){
        var x = arr[i] || {};
        if (x.__id__ == id) {
          // Now remove all the references
          x[clientId] = false;
          x.__count__--;
          if (x.__count__ <= 0){
            var sockets = socketMap[path].sockets;
            // Emit message to kill the channel as well
            sockets.map(function(socket){
              // Checking if socket is open before sending for cleanup - 1 implies it is open
              if (socket.readyState == 1)
                socket.send(JSON.stringify({ id : clientId , disconnect : true }));            
            });
          };
          break;
        }
      };
    },
    // Removes client from map of all ids
    unregclients : function(clientId , path){
      var arr = (clmap[path]|| {})[clientId] || [];
      for (var i=0; i < arr.length;i++){
        // Now remove all the references
        var x = arr[i];
        x[clientId] = false;
        x.__count__--;
        if (x.__count__ <= 0){
          var sockets = socketMap[path].sockets;
          // Emit message to kill the channel as well
          sockets.map(function(socket){
            // Checking if socket is open before sending for cleanup - 1 implies it is open
            if (socket.readyState == 1) {
              socket.send(JSON.stringify({ id :x.__id__, disconnect : true }));
            }
          });
        };
      };
      // Kill the array
      arr.length = 0;
    }
  };
})();


function _createWebSocket(opt,path, name, emit , isAggregate , onopencb) {
  var proto = "ws";
  var args = arguments;
  var ssl_opts = {};
  if (opt.doSSL) {
    proto = "wss";
    ssl_opts = {'cert': fs.readFileSync(opt.cert),
                'key': fs.readFileSync(opt.key)};
    ssl_opts = _.extend(ssl_opts, cfg.sslOptions);
  }
  var pathname = "/subscribe/"+path;
  
  var urlstr = url.format({'protocol': proto,
                           'slashes' : true,
                           'hostname': opt.host,
                           'port'    : opt.port,
                           'pathname': pathname});
  
  console.log("Creating websocket for: " + urlstr);
  
  try{ 
    var socket = new WebSocket(urlstr, ssl_opts);
  } catch(e) {
    console.log("Unable to connect ");
    socketMap[path] = undefined;
  }
  socket.on('open', function() {
    if (onopencb)
      onopencb();
  });
  // Remember all Id's used in this socket if aggregate
  var IdList = [];
  socket.on('message', function(data) {
    var count = 0;
    var raw_data = JSON.stringify(JSON.parse(data).data)
    for (var LPPP in JSON.parse(raw_data))
      count++;      
    // console.log('UNIS socket (): ', count , " for Path ",path);
    var smap =  socketMap;
    if (!smap[path].clients)
      return;
    smap[path] = smap[path] || {};
    raw_data.__source = name;
    //smap[path].clients = smap[path].clients || [];
    //console.log("Emitting to client " , smap[path].clients );
    if(!isAggregate) {
      smap[path].clients.forEach(function(client) {
        client.emit(emit, raw_data);
      });
    } else {
      var dataJ = (JSON.parse(raw_data));
      //console.log("Number of connected clients ", smap[path].clients.length,
      //            smap[path].clients.map(function(x){ return x.id;}));
      smap[path].clients.filter(function(x) {
        // Returns true if path doesn't exist
	var flag = false;
	for (var g in dataJ) {
	  var id = g;
	  var it = x[g];
	  // console.log(x.id ,path, g);
	  if (pathIdObj.isRegClient(x.id , path , g)) {
	    flag = true;
	    break;
	  }
	}	  
        return flag;
      }).forEach(function(client) {
        client.emit(emit, raw_data);
      }); 
    }
  });
  socket.on('close', function() {
    console.log('UNIS: socket closed');
  });
  process.on('uncaughtException', function (err) {
    console.error('Process ERROR:', err.stack);
    // restart sockets by killing eveything and calling this func again
    restart_socket(args,socket,IdList);
  });
  // save the socket handles
  var smap = socketMap;
  socketMap = socketMap || {};
  socketMap[path] = socketMap[path] || {};
  socketMap[path].sockets = socketMap[path].sockets || [];
  socketMap[path].sockets.push(socket);
}

function createWebSocket(opt,path, name, emit , isAggregate , onopencb) {
  for (var i = 0; i < opt.hostArr.length; i++) {
    var obj = {
      host : opt.hostArr[i],
      port : opt.portArr[i],
      key : opt.keyArr[i],
      doSSL : opt.doSSLArr[i],
      cert : opt.certArr[i]
    };
    _createWebSocket(obj,path, name, emit , isAggregate , onopencb);
  }
}
var DEFAULT_TIME = 1000;
var TIME_THRESHOLD = 5000000;
var R_TIME = DEFAULT_TIME;
var RESTART_TIMER , RESTART_AT = 0;
function restart_socket(args,socket, idList) {
  // Delete from socketMap
  console.log("REstarting socket in " + R_TIME + " seconds");
  var currTime = new Date().getTime();
  if (RESTART_AT < currTime) {
    if (currTime - RESTART_AT > TIME_THRESHOLD)
      R_TIME = DEFAULT_TIME;
    RESTART_AT = currTime + R_TIME;
    clearTimeout(RESTART_TIMER);
    RESTART_TIMER = setTimeout(function() {
      if (socketMap[args.path]) {
	var arr = socketMap[args.path].sockets || [];
	// Find and delete the socket from this array
	var i = arr.indexOf(socket); // Should give the index since it is exactly the same object
	pathIdObj.unregisterAllIds(args[1]);
	arr.splice(i,1);
      }
      _createWebSocket.apply(this,args);
      if (R_TIME*2 < TIME_THRESHOLD)
	R_TIME += R_TIME;  // exponential backoff
    },R_TIME);
  } else {
    console.log ("Restarting in " + (RESTART_AT - currTime)/1000 + "seconds");
  }
}

function _getGenericHandler(resource, emitName,client) {
  var opt = getHttpOptions({'name': resource});
  return function(data) {
    var path = resource;
    var emit = emitName;
    // if (data && data.id) {
    //   path = path + '/' + data.id;
    //   emit = emit + '_' + data.id;
    // }
    var smap = socketMap[path];
    if (data.id) {
      var obj = {
	query : { id: data.id },
	resourceType: resource
      };
      if (data.disconnect) {
        // Unregister the channel for the client
	//console.log("unregistering client:", client.id, path, data.id);
        pathIdObj.unregisterId(client.id , path,data.id);
      } else {
        // Sockets using /subscribeAgg gets its own map
        // console.log("Id" ,data.id);
	// IsRegClient
        if(!pathIdObj.isRegClient(client.id, path , data.id)) {
          if (!smap) {
            socketMap[path] = {'clients': [client]};
            createWebSocket(opt,path, resource, emit,true,function() {
              smap = socketMap[path];
              smap.sockets.forEach(function (x) {
		// only attempt if connected
		if (x.connected) {
                  x.send(JSON.stringify(obj));
		}
              });
            });
	    //console.log("registering client: ", client.id, path, data.id);
            pathIdObj.regClient(client.id,path,data.id);
          }
          else { 
            smap = socketMap[path];
            if (!pathIdObj.isRegId(data.id , path)) {
              smap.sockets.forEach(function (x) {
                // Assuming it is open
                try{
                  x.send(JSON.stringify(obj));
                  // console.log("Sent daata ", JSON.stringify(obj));
                } catch(e) {
                  // If not opened
                  x.on('open', function(){             
                    x.send(JSON.stringify(obj));
                  });
                }
              });
            }
            if (!pathIdObj.isClientOnPath(client.id , path)) {              
              smap.clients = smap.clients || [];
              smap.clients.push(client);
            }
	    //console.log("registering client: ", client.id, path, data.id);
            pathIdObj.regClient(client.id,path,data.id);
          }
        } else {
          // Avoid multi pushing for same client
          //socketMap[path].clients.push(client);
        }
      }

    } else {
      if (!socketMap[path]) {
        socketMap[path] = {'clients': [client]};
        createWebSocket(opt,path, resource, emit);
      }
      else {
        socketMap[path].clients.push(client);
      }
      smap = socketMap;
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

var onDisconnect = function(client) {
  return function(data) {
    console.log('Client disconnected:', client.conn.remoteAddress);
    if (resourceMap[client.id]) {
      resourceMap[client.id].forEach(function(type) {
        var smap = socketMap[type] || {};
        var clients = smap.clients;
        if (clients) {
          for (var i = clients.length - 1; i >= 0; i--) {
            if (client.id == clients[i].id) {
	      clients.splice(i, 1);
            }
          }
          pathIdObj.unregclients(client.id,type);
          // remove any subscribed channels
          //close the web socket to UNIS if the last client disconnected
          if (clients.length == 0) {
            console.log("Last client disconnected, closing sockets for: " + type);
            smap.sockets.forEach(function(s) {
	      s.close();
            });
            delete socketMap[type];
          }
        }        
        return false;
      });
      delete resourceMap[client.id];
    }
  };
};
var exnodeClient = require('./exnodeSockets');
var cartClient = require('./cartSocket');
// export function for listening to the socket
module.exports = function(client) {
  var getGenericHandler = function() {
    var args = [];
    args.push.apply(args,arguments);
    args.push(client);
    return _getGenericHandler.apply(this,args);
  };  
  // clean up sockets as necessary when a client disconnects
  client.on('disconnect',onDisconnect(client));

  // establish client socket
  console.log('Client connected:', client.conn.remoteAddress);
  client.on('node_request', getGenericHandler('nodes','node_data'));
  client.on('service_request', getGenericHandler('services','service_data'));
  client.on('measurement_request',  getGenericHandler('measurements','measurement_data'));
  client.on('metadata_request',  getGenericHandler('metadata','metadata_data'));
  client.on('port_request', getGenericHandler('ports','port_data'));
  client.on('link_request', getGenericHandler('links','link_data'));
  client.on('path_request', getGenericHandler('paths','path_data'));
  client.on('network_request', getGenericHandler('networks','network_data'));
  client.on('domain_request', getGenericHandler('domains','domain_data'));
  client.on('topology_request', getGenericHandler('topologies','topology_data'));
  client.on('event_request', getGenericHandler('events','event_data'));
  client.on('data_request', getGenericHandler('data','data_data'));  
  client.on('usgs_lat_search',exnodeClient.onUSGSLatSearch(client));  
  client.on('usgs_row_search',exnodeClient.onUSGSRowSearch(client));
  
  client.on('exnode_request',exnodeClient.onExnodeRequest(client));  
  var getAllChildExFilesDriver = exnodeClient.getAllChildExFilesDriver(client);
  var getAllChildExnodeFiles = exnodeClient.getAllChildExnodeFiles(client);

  client.on('exnode_getAllChildren', function(d) {
    // Do nothing for the time being 
    return;
    getAllChildExFilesDriver([d.id],d.id,function(){
      // Ok Done .. DO somethig if you want ..
      // console.log("done");
    });
    // getAllChildExnodeFiles(d.id , d.id);
  });
  
  client.on('deleteOrderGroup',cartClient.onDeleteOrder(client));
  client.on('getShoppingCart', cartClient.getShoppingCart(client));    
};

// var _nodeLocationMap = {};
// function getAllIpLocationMap(array , cb) {
//   array = array || [];
//   var locMap = {};
//   var i =0;
//   function done(){
//     i++;
//     if(i >= array.length - 1){
//       cb(locMap);
//       // Kil it
//       i = -111111;
//     }
//   }
//   array.forEach(function(val) {
//     if(_nodeLocationMap[val]){
//       locMap[val] = _nodeLocationMap[val];
//       done();
//     } else
//       freegeoip.getLocation(val, function(err, obj) {
// 	  if(err){
// 	    done();
// 	    return ;
// 	  }
// 	  locMap[val] = _nodeLocationMap[val] = [obj.longitude , obj.latitude];
// 	  done();
//       });
//   });  
// }
// exnodeApi.getExnodeDataIfPresent(['LC80100262015146LGN00'],function(arr) {
//   console.log(arr);
// },function(arr) {
//   console.log(arr);
// });
