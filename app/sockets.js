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

    function createWebSocket(path, name, emit) {
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
          //console.log('UNIS socket ('+name+'): '+data);        
          data.__source = name;
          socketMap[path].clients.forEach(function(client) {
            client.emit(emit, data);
          });
        });
        socket.on('close', function() {
          //console.log('UNIS: socket closed');
        });
        process.on('uncaughtException', function (err) {
          console.error('ERROR:', err.stack);
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
      var emit = emitName;
      if (data && data.id) {
        path = path + '/' + data.id;
        emit = emit + '_' + data.id;
      }
      if (!socketMap[path]) {
        socketMap[path] = {'clients': [client]};
        createWebSocket(path, resource, emit);
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

  function nameToSceneId(name) {
    return name.split(/[_.]/)[0];
  };
  function getExnodeData(sceneArr,precb , fullcb) {
    // split array into buckets of 5
    var Size = 5 ;
    // Clone the array 
    var arr = sceneArr.slice(0);   
    while (arr && arr.length > 0){
      var idlist = arr.splice(0,Size);
      idlist = idlist.map(function(x) {
        return x.substr(0,x.length-5);
      });
      var str = idlist.join(",");      
      // console.log( '/exnodes?fields=id,properties.metadata.scene_id&name=reg='+str);
      http.get({
        host : cfg.serviceMap.dev.url,
        port : cfg.serviceMap.dev.port,
        path : '/exnodes?fields=id,name&properties.metadata.scene_id='+str
        // path : '/exnodes?fields=id,name&name=reg='+str
      }, function(http_res) {
        var data = '';
        http_res.on('data', function (chunk) {
          data += chunk;
        });
        http_res.on('end',function() {
          var obj = JSON.parse(data);
          if(!obj || !_.isArray(obj))
            return;
          
          var notpresent = sceneArr.slice(0);
          var sceneIdArr = obj.map(function(x) { return nameToSceneId(x.name || "") ;});          
          notpresent = _.difference(notpresent,sceneIdArr);
          //console.log("NOt present sceneId " , sceneArr , notpresent , sceneIdArr);
          // Send precb with notpresent data
          // console.log("Not present ",notpresent , sceneIdArr);
          precb(notpresent);
          // Now send http reqeust to aggregate and return remaining data to fullcb
          var idlist = obj.map(function(x) { return x.id});
          var str = idlist.join(","); 
          if (idlist.length > 0)
          http.get({
            host : cfg.serviceMap.dev.url,
            port : cfg.serviceMap.dev.port,
            path : '/exnodes?id='+str
          }, function(http_res) {
            var data = '';
            http_res.on('data', function (chunk) {
              data += chunk;  
            });
            http_res.on('end',function() { 
              var obj = JSON.parse(data);
              var retMap  = {};
              obj.map(function(x) {
                var arr = retMap[nameToSceneId(x.name)] = retMap[nameToSceneId(x.name)] || [];
                arr.push(x);
              });
              
              fullcb(retMap);
            });
            http_res.on('error',function(e) {
              console.log("Error for Id ",id);
            });
          });
        });
        http_res.on('error',function(e) {
          console.log("Error for Id ",id);
        });
      });
    };
  };
  
  client.on('exnode_request',function(data){
    var arr = data.sceneId;
    if (!_.isArray(arr))
      arr = [data.sceneId];
    getExnodeData(arr, function(data){
      client.emit('exnode_nodata', { data : data});
    },function(map){
      client.emit('exnode_data', {data : map});
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
            recArr.push(it.id);
            //console.log("Proceeding with Id ",it.id);
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

  client.on('exnode_getAllChildren', function(d){
    // Do nothing for the time being
    return;
    getAllChildExFilesDriver([d.id],d.id,function(){
      // Ok Done .. DO somethig if you want ..
      // console.log("done");
    });
    // getAllChildExnodeFiles(d.id , d.id);
  });


  function simplifyListing() {
    //Simplifies the registeredClientMap for serialization to the download listing
    // This is required because the download listing currently stores client objects,
    // serialization of which results in stack overflows
    var registeredFiles = [] 
    for (var key in registeredClientMap) {
      var entry = registeredClientMap[key]
      if (entry === undefined) {continue}
      registeredFiles.push(
         {hashId: entry.hashId,
          filename: entry.filename, 
          totalSize: entry.totalSize, 
          connections: entry.connections
         })
    }
    return registeredFiles
  }

  client.on('peri_download_req_listing', function(data) {
    console.log("Listing requested")
    client.emit('peri_download_listing', simplifyListing())
  });

  client.on('peri_download_request', function(data) {
    // The id according to which multiple downloads happen
    var id = data.id ;
    console.log('all fine till here ');
    client.emit('peri_download_Nodes', {data : {}});
    // AddNewConnection
    addNewConn(client, id);
  });

  client.on("peri_download_clear",function(data){
    var serve = registeredClientMap[data.hashId]
    var messageName = 'peri_download_clear'
    emitDataToAllConnected(serve , messageName , data)
    
    // Kill it - will be auto gc'd
    registeredClientMap[data.hashId] = undefined

    console.log("Download cleared ", data)
  });

  // The latest download hashmap
  client.on('peri_download_register', function(data) {
    var id = data.hashId
    var name = data.filename
    var totalSize = data.totalSize
    var conn = data.connections

    console.log("registered new download: ", data.hashId);

    var old = registeredClientMap[id] || {};
    data.registeredRequestClientArr = old.registeredRequestClientArr || [];
    data.exists = true ;
    registeredClientMap[id] = data ;
    var arr = data.registeredRequestClientArr 

    console.log("already registered clients: ", arr.length);
    client.emit('peri_download_listing', simplifyListing())

    emitDataToAllConnected(registeredClientMap[id], 'peri_download_info', 
      {id : id , name : name , size : totalSize , connections : conn});

  });

  client.on('peri_download_pushdata', function(data) {
    var id =  data.hashId ;
    var serve = registeredClientMap[id];
    if (serve === undefined) {
      console.log("Message received about un-registered download: ", data.hashId)
      return
    }
    var messageName = 'peri_download_progress' ,
    dataToBeSent = data;
    dataToBeSent.totalSize = serve.totalSize;

    if(serve){
      emitDataToAllConnected(serve , messageName , dataToBeSent);
    } else {
      // Do some error stuff or fallbaCK
      client.emit('peri_download_fail');
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
    for ( var i = 0 ; i < arr.length ; i++){
      client.emit(arr[i].name , arr[i].data);
    }
  } else {
    // Send an error for now , then store it for later use anyway
    client.emit('peri_download_info', {isError : true });
    registeredClientMap[id] = registeredClientMap[id] || {} ;
    var arr = registeredClientMap[id].registeredRequestClientArr || [];
    arr.push(client);
    registeredClientMap[id].exists = false ;
    registeredClientMap[id].registeredRequestClientArr = arr ;
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
