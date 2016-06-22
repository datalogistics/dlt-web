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
var WebSocket = require('ws')
, q = require('q')
,_ = require('underscore');

var downloadPublishers = {}; //List of download clients currently sharing progress {client.conn.id:[sessionId, ...], ...}
var downloadStatus = {} //Downloaded status information by file.  This info is received from publishers and sent to listeners
var downloadListeners = []; //List of angular clients current watching progress

// export function for listening to the socket
module.exports = function(client) {
  //Web client requests a listing of current files
  client.on('peri_download_req_listing', function(data) {
    console.log("Listing requested")

    //Get just the header info from teh client listing
    var summary = Object.keys(downloadStatus).map(
      function (key) {
        var entry = downloadStatus[key]
        return {sessionId: entry.sessionId,
                filename: entry.filename, 
                size : entry.size, 
                connections: entry.connections}
      })

    client.emit('peri_download_listing', summary)
    rememberListener(client)
  });

  //Web client requests details on a particular file
  client.on('peri_download_request', function(data) {
    rememberListener(client)

    var sessionId = data.id
    console.log("Request info for download: ", sessionId);
    var session = downloadStatus[sessionId] || undefined

    if (session === undefined) {
      console.log("Could not find requested listing: ", sessionId)
      client.emit("peri_download_error", {id: sessionId, message: "Session not found."})
    } else {
      //Send basic summary info
      client.emit('peri_download_info', 
        {filename: session.filename,
         sessionId: sessionId,
         size: session.size,
         connections: session.connections})
      //If found emit all old session information
      session.updates.forEach(function(msg) {client.emit('peri_download_progress', msg)})
      //TODO: Send a session-closed message, if the transmitting client has finished/closed
    }
  });


  //Download client indicates a download is done
  client.on("peri_download_clear", function(data){
    var status = downloadStatus[data.sessionId]
    var messageName = 'peri_download_clear'
    //TODO: Update status in a listing, send out a status update message
  });


  //Download client creates a new download session 
  client.on('peri_download_register', function(data) {
    var id = data.sessionId
    var name = data.filename
    var size = data.size
    var conn = data.connections
    var emitData = {sessionId: id, filename: name, size: size, connections: conn};
    
    //TODO: Add some session-status tracking information here -- Open, finished, disconnected, timedout???
    data.exists = true;
    data.updates = []
    data.lastTouched = Date.now()
    downloadStatus[id] = data 
   
    downloadListeners.forEach(function(c) {c.emit('peri_download_list_info', emitData)})

    var sessionsOnPublisher = downloadPublishers[client.conn.id] || []
    sessionsOnPublisher.push(id)
    downloadPublishers[client.conn.id] = sessionsOnPublisher
    console.log("registered new download: ", data.sessionId);
  });


  //Download client sends a status update on an existing session
  client.on('peri_download_pushdata', function(data) {
    var id = data.sessionId;
    var status = downloadStatus[id]
    if (status === undefined) {
      console.log("Message received about un-registered download: ", id)
      return
    }

    var messageName = 'peri_download_progress' 
    data.size = status.size;
   
    downloadListeners.forEach(function(conn) {conn.emit('peri_download_progress', data)})
    status.updates.push(data)
    status.lastTouched = Date.now()
  });


  //Download clien disconnects
  client.on('disconnect', function(data) {
    var connectionId = client.conn.id
    var sessions = downloadPublishers[connectionId] || [] 
    if (sessions.length > 0) {
      sessions = sessions.slice() //Copy sessions list to ensure deletes go as expected
      console.log("Client disconnected.  Clearing sessions: ", sessions)
      //sessions.forEach(function(sessionId) {
      // TODO: Update download status data structure, send out an status update message
      //}
    }
    downloadPublishers[connectionId] = undefined
  })
}

function rememberListener(client) {
    if (downloadListeners.indexOf(client) < 0) {
      downloadListeners.push(client)
    }
}

//Cleanup stored information -----
var timeout        = .5 * (6 * 1e4);    // clear client socket after 5 minutes of inactivity
var check_interval = .1 * (6 * 1e4);    // check all registered clients every minute

setInterval(function(){
  var time = Date.now()
  
  for (session in downloadStatus) {
    var lastProgressTime = downloadStatus[session].lastTouched
    if ((time - lastProgressTime) > timeout) {
      delete downloadStatus[session] 

      var msg = {sessionId: session, status: "timeout"}
      downloadListeners.forEach(function(client) {
        client.emit('peri_download_clear', msg); 
      })
      console.log("Timeout for session: ", session)
    }
  }
}, check_interval);


