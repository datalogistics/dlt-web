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
, xmlparse = require('xml2js').parseString
, request = require('request')
, querystring = require('querystring')
, cfg = require('../properties')
, q = require('q')
, exnodeApi = require('./exnodeApi')
, usgsapi = require("./usgsapi")
, bdaApi = require("./bdaApp")
,_ = require('underscore');

WebSocket.super_.defaultMaxListeners = 0;

// Storing all the data in memory -- ya seriously gonna do that - Data manually deleted in 15 minutes
// This map stores the fileData which is used to retrieve it.
var rMap = cfg.routeMap;

var socketMap = {};
var resourceMap = {};
// A map of maps from path to client
var pathIdObj = (function(){
  // Store the map of maps used to register client for each path , each id
  var pmap = {};
  // Store the map of maps from path to client Id to array of pmap leaf obj
  var clmap = {};
  return{
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
  }
})();


function createWebSocket(opt,path, name, emit , isAggregate , onopencb) {
  for (var i = 0; i < opt.hostArr.length; i++) {
    var proto = "ws";
    var ssl_opts = {};
    if (opt.doSSLArr[i]) {
      proto = "wss";
      ssl_opts = {'cert': fs.readFileSync(opt.certArr[i]),
                  'key': fs.readFileSync(opt.keyArr[i])};
      ssl_opts = _.extend(ssl_opts, cfg.sslOptions);
    }
    if (isAggregate) {
      var pathname = "/subscribeAgg/" + path ;
    } else {
      var pathname = "/subscribe/" + path ;
    }
    var urlstr = url.format({'protocol': proto,
                             'slashes' : true,
                             'hostname': opt.hostArr[i],
                             'port'    : opt.portArr[i],
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
    socket.on('message', function(data) {
      //console.log('UNIS socket (): ', data);
      var smap =  socketMap;
      smap[path] = smap[path] || {};
      if (!smap[path].clients)
        return;          
      data.__source = name;
      //smap[path].clients = smap[path].clients || [];
      //console.log("Emitting to client " , smap[path].clients );
      if(!isAggregate) {
        smap[path].clients.forEach(function(client) {
          client.emit(emit, data);
        });
      } else {
        var dataId1 = (JSON.parse(data)).id;
        //console.log("Number of connected clients ", smap[path].clients.length,
	//            smap[path].clients.map(function(x){ return x.id;}));
        smap[path].clients.filter(function(x){
          // Returns true if path doesn't exist
          return pathIdObj.isRegClient(x.id , path , dataId1);            
        }).forEach(function(client) {
          client.emit(emit, data);
        }); 
      }
    });
    socket.on('close', function() {
      console.log('UNIS: socket closed');
    });
    process.on('uncaughtException', function (err) {
        console.error('Process ERROR:', err.stack);
    });
    // save the socket handles
    var smap = socketMap;
    socketMap = socketMap || {};
    socketMap[path] = socketMap[path] || {};
    socketMap[path].sockets = socketMap[path].sockets || [];
    socketMap[path].sockets.push(socket);
  }
}

function _getGenericHandler(resource, emitName,client){
  var opt = cfg.getHttpOptions({'name': resource});    
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
        id : data.id 
      };
      if (data.disconnect) {
        // Unregister the channel for the client
	//console.log("unregistering client:", client.id, path, data.id);
        pathIdObj.unregisterId(client.id , path,data.id);
      } else {
        // Sockets using /subscribeAgg gets its own map
        //console.log("Id" ,data.id);
        if(!pathIdObj.isRegClient(client.id, path , data.id)) {
          if (!smap) {
            socketMap[path] = {'clients': [client]};        
            createWebSocket(opt,path, resource, emit,true,function(){              
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

// export function for listening to the socket
module.exports = function(client) {
  var getGenericHandler = function() {
    var args = [];
    for (var i= 0;i<arguments.length;i++)
      args.push(arguments[i]);
    args.push(client);
    return _getGenericHandler.apply(this,args);
  };
  
  // clean up sockets as necessary when a client disconnects
  client.on('disconnect', function(data) {
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

  client.on('usgs_lat_search',function(data){
    var params = data;
    var paramString = querystring.stringify(params);
    // Make a request to the USGS get_metadata url which returns the data in xml form
    var url = cfg.usgs_lat_searchurl + "?"+paramString;
    console.log(url);
    request(url,function(err,r,resp){
      xmlparse(resp, function(err , result){
        console.dir(result);      
        var data = result || {};
        data = data.searchResponse || [];      
        var r = (data.metaData || []).map(function(x) {
          for (var i in x) {
            if(_.isArray(x[i]) && x[i].length == 1){
              x[i] = x[i][0];
            }
          };
          x.name = x.sceneID;
          return x;
        });
        if (data.length == 0){
          try{
            r.error = result.html.body ;
          } catch(e){
            r.error ="No results found";
          }
        };
        /*********** Emitting some data here **********/
        client.emit('usgs_lat_res',r);

        // // Use the data to query mongo where name maps to id
        // // Super hacky and super slow -- temporary way
        // r.map(function(x){
        // });        
      });
    });
  });

  client.on('usgs_row_search', function(data){
    var params = data;
    var paramString = querystring.stringify(params);
    // Make a request to the USGS get_metadata url which returns the data in xml form
    var url = cfg.usgs_row_searchurl + "?"+paramString;
    console.log(url);
    request(url,function(err,r,resp){
      if (err) {
        client.emit('usgs_row_res',{error : err});
        return;
      }
      xmlparse(resp, function(err , result){
        var data = result || {};
        data = data.searchResponse || [];      
        var r = (data.metaData || []).map(function(x) {
          for (var i in x) {
            if(_.isArray(x[i]) && x[i].length == 1){
              x[i] = x[i][0];
            }
          };
          x.name = x.sceneID;
          return x;
        });
        if (data.length == 0){
          try{
            r.error = result.html.body ;
          } catch(e){
            r.error ="No results found";
          }
        };
        /*********** Emitting some data here **********/
        client.emit('usgs_row_res',r);

        // // Use the data to query mongo where name maps to id
        // // Super hacky and super slow -- temporary way
        // r.map(function(x){
          
        // });        
      });
      // Now use this response to 
    });        
  });

  var nameToSceneId = exnodeApi.nameToSceneId;
  function getExnodeData(sceneArr,precb , fullcb) {
    exnodeApi.getExnodeDataIfPresent(sceneArr,precb,fullcb);   
  };
  
  client.on('exnode_request',function(data){
    var arr = data.sceneId;
    if (!_.isArray(arr))
      arr = [data.sceneId];
    getExnodeData(arr, function(data){
      client.emit('exnode_nodata', { data : data});
    },function(obj){
      var retMap  = {};
      obj.map(function(x) {
        var arr = retMap[nameToSceneId(x.name)] = retMap[nameToSceneId(x.name)] || [];
        arr.push(x);
      });
      client.emit('exnode_data', {data : retMap});
    });
  });


  function getAllChildExFilesDriver(arr , emitId , cb) {
    if (!arr || !arr.length) {
      // Done
      cb();
      return ;
    } else if(arr) {
      if (arr.length > 5) {
        // console.log(arr);
        var tmp = arr.splice(0,4);
        getAllChildExFilesDriver(tmp, emitId , function(narr){
          arr.push.apply(arr,narr);
          getAllChildExFilesDriver(arr,emitId,cb);
        });        
      } else {
        var promise = getAllChildExnodeFiles(arr, emitId);
        // console.log(promise);
        // Just execute cb
        if (promise && promise.then)
          promise.then(function(arr){
            getAllChildExFilesDriver(arr,emitId,cb);
          });
      }      
    }
  }

  function getAllChildExnodeFiles(id , emitId) {
    var defer = q.defer();    
    if (id == null) {
      // This can never occur in an array since the parent can never be a part of a child
      id = 'null=';
    } else if (_.isArray(id)){   
      id = id.join(",");
    };    
    
    http.get({
      host : cfg.serviceMap.dev.url,
      port : cfg.serviceMap.dev.port,
      path : '/exnodes?fields=id,parent,selfRef,mode,name&parent='+ id
    }, function(http_res) {
      var data = '';
      http_res.on('data', function (chunk) {
        data += chunk;
      });
      http_res.on('end',function() {
        var obj = JSON.parse(data);
        // console.log( obj );
        var recArr = [];
        var fileArr = [];
        for (var i=0 ; i < obj.length ; i++) {
          var it = obj[i];
          if (it.mode == 'file') {
            // console.log("emitting " , it); 
            fileArr.push(it);
          } else {
            recArr.push(it.id);            //console.log("Proceeding with Id ",it.id);
          }
        };
        // console.log("FIles " , fileArr);
        client.emit('exnode_childFiles',{ arr : fileArr , emitId : emitId});
        defer.resolve(recArr);
        //getAllChildExnodeFiles(recArr, emitId);
      });
      http_res.on('error',function(e) {
        console.log("Error for Id ",id);
        defer.resolve([]);
      });
    });
    return defer.promise;   
  };

  client.on('exnode_getAllChildren', function(d) {
    // Do nothing for the time being 
    return;
    getAllChildExFilesDriver([d.id],d.id,function(){
      // Ok Done .. DO somethig if you want ..
      // console.log("done");
    });
    // getAllChildExnodeFiles(d.id , d.id);
  });
  
  client.on('getShoppingCart', function(d) {
    var usgsKey = d.key;
    var username,password;
    var isEncrypted = false;
    var tokenStr;
    var sep = "@@";
    if (d.isToken) {
      var pair = d.token.split(sep);
      username = pair[0];
      password = pair[1];
      tokenStr = d.token;
    } else {
      var encrypt = new bdaApi.Encryption();
      username = encrypt.encrypt(d.username);
      password = encrypt.encrypt(d.password);
      tokenStr = username + sep + password;
    }
    isEncrypted = true;
    bdaApi.getAllOrders(username,password,isEncrypted)
      .then(function(r) {
        var items = r;
        // var items = r.data.orderItemBasket || [];
        // items.push.apply(items,r.data.bulkDownloadItemBasket);
        client.emit("cart_nodata", { data : [] , size : items.length , token : tokenStr});
        // The API can use any credentials - Hard coding
        var uname = cfg.usgs_api_credentials.username , pwd = cfg.usgs_api_credentials.password;        
        return usgsapi.login(uname,pwd)
          .then(function(r) {
            var usgsKey = r.data;            
            usgsapi.getMetaData(usgsKey,"LANDSAT_8",items)
              .then(function(res) {
                client.emit('cart_data_res',{ data : res.data , token : tokenStr});
                exnodeApi.getExnodeDataIfPresent(idArr , function(arr){
                  client.emit("cart_nodata",{ data : arr , size : items.length , token : tokenStr});
                  // console.log("Not present " , arr);
                }, function(obj) {
                  var retMap  = {};
                  obj.map(function(x) {
                    var arr = retMap[nameToSceneId(x.name)] = retMap[nameToSceneId(x.name)] || [];
                    arr.push(x);
                  });
                  client.emit("cart_data",{ data : retMap, size : items.length , token : tokenStr});
                  // console.log("Present " , arr);
                });
              });
          });
      })
      .catch(function(x) {
        if (x instanceof Error) 
          client.emit("cart_error", { error : x});
        else
          client.emit("cart_error", { errorMsg : true , error : x});
      });
  });
  
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
}
