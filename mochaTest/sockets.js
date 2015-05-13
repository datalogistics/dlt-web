var assert = require("assert")
, sockets = require("../app/sockets.js")
, request = require('request');

var io = require('socket.io-client');
var socketURL = 'http://localhost:42424';
var options ={
  transports: ['websocket'],
  'connect timeout' : 500,
  'force new connection': false  
};



describe('Sockets', function() {
  var client = io.connect(socketURL, options);
  it("should correctly connect to node sockets", function (done) {
    client.on('error',function(data,err) {
      throw err;
    });
    client.on('connect_error',function() {
      throw Error("Timeout error ");
    });
    client.on('connect', function(data){
      done();
    });
  });

  it("should get some metadata" , function(done) {
    request(socketURL + "/api/metadata", function(err,r,resp){
      var arr = JSON.parse(resp) ;      
      arr.forEach(function(x) {
        client.emit('data_request',{id : x.id});
      });
      done();
    });
  });
  
  it("should get atleast one measurement" , function (done) {
    this.timeout(0);        
    client.on('data_data',function(data) {
      done();
    });
    //client.emit('service_request',{});
  });  
});
