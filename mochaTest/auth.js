var assert = require("assert")
, request = require('request');
var _ = require("underscore");
request = request.defaults({jar : true});
var fs = require("fs");

var unisUrl = 'http://192.168.111.100:8888';
describe('Auth',function () {  
  it("Should login",function(done) {
    request.post(unisUrl+"/login",{form : {"cert" : fs.readFileSync("../unis/periscope/ssl/server.pem")}})
      .on('data',function(resp,body) {
        console.log(resp.toString());
        var res = JSON.parse(resp.toString());
        if (res.loggedIn)
          done();
        else
          throw Error("Not logged in");
      });
  });
  it("Should get landsat data now ", function(done) {
    var fstr = "";
    request.get(unisUrl+"/nodes")
      .on('data',function(resp,body) {
        fstr+= resp.toString();//.replace(/\$/g,"S");
      })
      .on('end',function() {
        var res = JSON.parse(fstr);        
        if (!res.length)
          throw new Error("Empty");
        for (var i = 0; i < res.length; i++) {
          var k = res[i];
          if (k.secToken.indexOf("landsat") == -1) {
            throw new Error("No Landsat ", res);
          }
        }
        done();
      });    
  });
});
