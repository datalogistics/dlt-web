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

// export function for listening to the socket
module.exports = function (client_socket) {
  var unis_sub = 'wss://dlt.incntre.iu.edu:9000/subscribe/'
  var ms_sub = 'wss://dlt.incntre.iu.edu:9001/subscribe/'
  var ssl_opts = {'cert': fs.readFileSync('./dlt-client.pem'),
		  'key': fs.readFileSync('./dlt-client.pem'),
		  rejectUnauthorized: false}

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

  client_socket.on('data_request', function(data) {
    console.log(data.id);

    if (data.id) {
      // Create socket to listen for updates on data
	    var dataSocket = new WebSocket(ms_sub + 'data/' + data.id, ssl_opts);

      dataSocket.on('open', function(event) {
        console.log('UNIS: Data ID socket opened');
      });

      dataSocket.on('message', function(data) {
        console.log('UNIS: data_data: ' + data);
        client_socket.emit('data_data', data);
      });

      dataSocket.on('close', function(event) {
        console.log('UNIS: Data ID socket closed');
      });
    } else {
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
    }
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

  //Can later create this array with
  var nodeIpArray = ["24.1.111.131" , // bloomington
                     "173.194.123.46", // google
                     "128.83.40.146" , // UT austin
                     "128.2.42.52" , // CMU
                     "130.207.244.165" // GA Tech
                     ];

  client_socket.on('eodnDownload_request', function(data) {
	  getAllIpLocations(nodeIpArray,function(data){
		  var nodeLocations = data;
		  client_socket.emit('eodnDownload_Nodes', {data : nodeLocations});
	  });
  });
  setInterval(function(){
	  client_socket.emit('eodnDownload_Progress', {data : { ip : "24.1.111.131" , progress : 5}});
  },2000)
};


var _nodeLocations;
function getAllIpLocations(array , cb){
	if(_nodeLocations){
		cb(_nodeLocations);
	}
	var locArr = [] , i =0;
	function done(){
		i++;
		if(i >= array.length - 1){
			_nodeLocations = locArr ;
			cb(locArr);
			// Kil it
			i = -111111;
		}
	}
	array.forEach(function(val) {
		freegeoip.getLocation(val, function(err, obj) {
			if(err){
				done();
				return ;
			}
			locArr.push({ip : val , loc : [ obj.longitude , obj.latitude]});
			done();
		});
	});

}
