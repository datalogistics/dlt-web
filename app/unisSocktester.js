var WebSocket = require('ws');
var fs = require('fs');
var socket = new WebSocket("ws://192.168.0.9:8888/subscribeAgg/data");
// var socket = new WebSocket("wss://dlt.incntre.iu.edu:9001/subscribeAgg/data", {
//   'cert': fs.readFileSync('../dlt-client.pem'),
//   'key': fs.readFileSync('../dlt-client.pem'),
//   requestCert: true,
//   rejectUnauthorized: false
// });
socket.on('open', function() {
  console.log('UNIS socket opened');
   socket.send('{"id" : "55007f56fe619001f5b507b6"}');
  console.log("sent");
});
socket.on('message', function(data) {
  // if (/data/.test(name))
  console.log('UNIS socket data ',data);  
});
socket.on('close', function() {
  console.log('UNIS: socket closed');
});
