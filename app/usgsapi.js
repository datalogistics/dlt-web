var path = require('path')
, fs = require('fs')
, readline = require('readline')
, http = require('http')
, https = require('https')
, url = require('url')
// , cfg = require('../properties')
, util = require('util')
, _ = require('underscore')
, querystring = require('querystring')
, request = require('request')
, ejs = require('ejs')
, q = require('q');

var baseurl = "http://earthexplorer.usgs.gov/inventory/json/";
var baseurlHtpps = "https://earthexplorer.usgs.gov/inventory/json/";
var usgsapi = {
  _call : function(name , params , cb) {
    var def = q.defer();
    var jsonStr = JSON.stringify(params);
    request.get(baseurlHtpps + name + '?jsonRequest='+jsonStr  , function(err,r,resp) {
      resp = JSON.parse(resp);
      def.resolve(resp);
      if (cb)
        cb.apply(this,arguments);
    });
    return def.promise;
  },
  login : function(uname,pwd) {
    var json = {
      username : uname ,
      password : pwd
    };
    return this._call("login",{ username : uname , password: pwd });
  },
  logout  : function(key) {
    this._call("logout",{ apiKey : key } , function(err,r,resp){
      console.log(resp);
    });
  },
  getShoppingCart : function(key) {
    console.log(key);
    return this._call("itembasket", { apiKey : key });
  },
  clearCart : function(key , node , datasetName ) {  
    this._call("clearorder", { apiKey : key, node : node , datasetName : datasetName});
  },
  addRoutes : function(prefix , app) {    
    app.post(prefix + 'login', function (req ,res) {
      var uname = req.params.username;
      var pwd = req.params.password;
      usgsapi.login(uname,pwd).then(function(data){
        res.json({ key : data.data });
      });
    });
    app.get(prefix + 'cart' , function(req,res) {
      
    });
  }
};

// usgsapi.login("indianadlt","indiana2014")
//   .then(function(r) {
//     //    console.log(r);
//     var usgsKey = r.data;
//     usgsapi.getShoppingCart(usgsKey).then(function(r) {      
//       console.log(JSON.stringify(r.data.bulkDownloadItemBasket,null));
//     });
    
//   });


module.exports = usgsapi;
