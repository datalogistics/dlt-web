var assert = require("assert"),
    sockets = require("../app/sockets.js");

var io = require('socket.io-client');
var socketURL = 'http://localhost:42424';
var options ={
  transports: ['websocket'],
  'connect timeout' : 500,
  'force new connection': false  
};



// describe('Sockets', function() {
//   var client = io.connect(socketURL, options);
//   it("should correctly connect to node sockets", function (done) {
//     client.on('error',function(data,err) {
//       throw err;
//     });
//     client.on('connect_error',function() {
//       throw Error("Timeout error ");
//     });
//     client.on('connect', function(data){
//       //client.emit('connection name', chatUser2);
//       client.emit('node_request',{});
//       done();
//     });
//   });
//   it("should now get node data" , function (done) {
//     console.log("nnnn");
//     client.on('node_data',function(data) {
//       console.log(data);
//       done();
//     });
//     client.emit('node_request',{});
//   });  
// });

// describe('Array', function(){
//   describe('#indexOf()', function(){
//     it('should return -1 when the value is not present', function(){
//       assert.equal(-1, [1,2,3].indexOf(5));
//       assert.equal(-1, [1,2,3].indexOf(0));
//     })
//   })
// });









