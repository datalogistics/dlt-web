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
var assert = require("assert")
, sockets = require("../app/sockets.js")
, request = require('request');

var io = require('socket.io-client');
var socketURL = 'https://localhost';
var options ={
  // transports: ['websocket'],
  'connect timeout' : 5000,
  'force new connection': false  
};

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

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
  var arrStr;
  // it("should get some metadata" , function(done) {
  //   request({url : socketURL + "/api/metadata",rejectUnhauthorized : false}, function(err,r,resp){
  //     var arr = JSON.parse(resp) ;
  //     arrStr = arr.map(function(x) { return x.id;}).join(",");
      
  //     arr.forEach(function(x) {	
  //       client.emit('data_request',{id : x.id});
  //     });
  //     done();
  //   });
  // });

  // it("should get cart" , function(done) {
  //   this.timeout(10000);
  //   client.emit('getShoppingCart',{username : "prakraja", password : "prak8673"});
  //   client.on('cart_data_res',function(x) {
  //     console.log(x);
  //     done();
  //   });
  // });
   
  it("should get atleast one measurement for Ids " , function (done) {
    console.log("Data ids ",arrStr);
    client.emit("data_request",{"id":"56156c738a41dd2d5b180c23"});
    this.timeout(0);
    client.on('data_data',function(data) {
      console.log(data);
      done();
    });
    //client.emit('service_request',{});
  });  
});
