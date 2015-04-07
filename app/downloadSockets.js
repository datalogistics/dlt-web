var WebSocket = require('ws')
, q = require('q')
,_ = require('underscore');

var downloadPublishers = {}; //List of download clients currently sharing progress {client.conn.id:[sessionId, ...], ...}
var downloadListeners = []; //List of angular clients current watching progress


var registeredDownloadClients = []; //List of angular clients listening for registrations
var registeredClientMap = {}; //List of clients listening for download progress
var rClientsLastProgressMap = {};
var rClientsLastUsedMap = {};



var timeout        = 5 * (6 * 1e4);    // clear client socket after 5 minutes of inactivity
var check_interval = 2 * (6 * 1e4);    // check all registered clients every 2 minutes

setInterval(function(){
  var time = (new Date()).getTime();
  for(var i in registeredClientMap){
    var c = registeredClientMap[i] ;
    if(!c || !c.sessionId)
      continue ;
    var id = c.sessionId,
    lastProgressTime = rClientsLastProgressMap[id]
    lastUsedTime = rClientsLastUsedMap[id];
    if ( (time - lastProgressTime) > timeout || (time - lastUsedTime) > timeout ) {
      registeredClientMap[id] = undefined ;
      
      //Send a 'clear message' 
      var msg = {sessionId: id, status: "timeout"}
      registeredDownloadClients.forEach(function(client) {
        client.emit('peri_download_clear', msg); 
      })
    }
  };
}, check_interval);



function clearDownload(sessionId, connectionId, reason) {
  var msg = {sessionId: sessionId, status: reason}
  var serve = registeredClientMap[sessionId]
  emitDataToAllConnected(serve , 'peri_download_clear', msg)
  registeredClientMap[sessionId] = undefined
  
  registeredDownloadClients.forEach(function(client) {
    client.emit('peri_download_clear', msg); 
  })

  if (connectionId === undefined) {return}

  var reportingSessions = downloadPublishers[connectionId] 
  if (reportingSessions === undefined) {
    console.log("Error looking up reporting information on clear.", sessionId, connectionId, reason)
  } else {
    var sessionIdx = reportingSessions.indexOf(sessionId)
    if (sessionIdx >= 0) {reportingSessions.splice(sessionIdx, 1);}
    if (reportingSessions.length == 0) {
      downloadPublishers[connectionId] = undefined
    }
    console.log("Download cleared ", sessionId)
  }
}

function addNewConn(client, id){
  var downloadAgent = registeredClientMap[id];
  if(downloadAgent && downloadAgent.exists){
    var q = downloadAgent;
    // Push the current socket so that it can get the emitted download info, if its not already
    if (q.registeredRequestClientArr.indexOf(client) < 0) {
      q.registeredRequestClientArr.push(client);
    }

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
    var id = serve.sessionId || serve.id;
    rClientsLastProgressMap[id] = time ;
    // Publish to all sockets in the array
    var nArr = [] , flag = false;
    for(var i=0; i < arr.length ; i++) {
      // push to the sockets which are alive
      var sock = arr[i];
      if(arr[i].connected){
        flag = true ;
        arr[i].emit(messageName, dataToBeSent);
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
// export function for listening to the socket
module.exports = function(client) {
  function simplifyListing() {
    // Simplifies the registeredClientMap for serialization to the download listing
    // This is required because the download listing currently stores client objects,
    // serialization of which results in stack overflows
    var registeredFiles = [] 
    for (var key in registeredClientMap) {
      var entry = registeredClientMap[key]
      if (entry === undefined) {continue}
      registeredFiles.push(
         {sessionId: entry.sessionId,
          filename: entry.filename, 
          size : entry.size, 
          connections: entry.connections
         })
    }
    return registeredFiles
  }

  client.on('peri_download_req_listing', function(data) {
    console.log("Listing requested")
    // save the client for future updates if not already known
    if (registeredDownloadClients.indexOf(client) < 0) {
      registeredDownloadClients.push(client)
    }

    client.emit('peri_download_listing', simplifyListing())
  });

  client.on('peri_download_request', function(data) {
    // The id according to which multiple downloads happen
    var id = data.id ;
    console.log("Request info for download: " + id);
    // AddNewConnection
    addNewConn(client, id);
  });

  client.on("peri_download_clear", function(data){
    var serve = registeredClientMap[data.sessionId]
    var messageName = 'peri_download_clear'
    //clearDownload(data.sessionId, client.conn.id, "complete")
  });

  // The latest download hashmap
  client.on('peri_download_register', function(data) {
    var id = data.sessionId
    var name = data.filename
    var size = data.size
    var conn = data.connections
    var emitData = {sessionId: id, filename: name, size: size, connections: conn};
    
    console.log("registered new download: ", data.sessionId);

    var old = registeredClientMap[id] || {};
    data.registeredRequestClientArr = old.registeredRequestClientArr || [];
    data.exists = true;
    registeredClientMap[id] = data;
    var arr = data.registeredRequestClientArr
    
    for (var i=registeredDownloadClients.length-1; i>=0; i--) {
      var c = registeredDownloadClients[i];
      if (c.connected) {
	//Remove if we start keeping a single list of clients instead of separate list and progress lists 
        c.emit('peri_download_list_info', emitData);
      }
      else {
        registeredDownloadClients.splice(i, 1);
      }
    }

    emitDataToAllConnected(registeredClientMap[id], 'peri_download_info', emitData);


    var sessionsOnReporter = downloadPublishers[client.conn.id] || []
    sessionsOnReporter.push(id)
    downloadPublishers[client.conn.id] = sessionsOnReporter
    console.log("Registered for connection", sessionsOnReporter)
  });

  client.on('peri_download_pushdata', function(data) {
    var id =  data.sessionId ;
    var serve = registeredClientMap[id];
    if (serve === undefined) {
      console.log("Message received about un-registered download: ", data.sessionId)
      return
    }

    var messageName = 'peri_download_progress' ,
    dataToBeSent = data;
    dataToBeSent.size = serve.size;
    
    if(serve){
      emitDataToAllConnected(serve , messageName , dataToBeSent);
    } else {
      // Do some error stuff or fallbaCK
      client.emit('peri_download_fail');
    }
  });

  client.on('disconnect', function(data) {
    var connectionId = client.conn.id
    var sessions = downloadPublishers[connectionId] || [] 
    if (sessions.length > 0) {
      sessions = sessions.slice() //Copy sessions list to ensure deletes go as expected
      console.log("Client disconnected.  Clearing sessions: ", sessions)
      //sessions.forEach(function(sessionId) {clearDownload(sessionId, connectionId, "Discconnected")})
    }
    downloadPublishers[connectionId] = undefined
  })

}

