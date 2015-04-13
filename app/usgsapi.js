var path = require('path')
, fs = require('fs')
, readline = require('readline')
, http = require('http')
, https = require('https')
, url = require('url')
// , cfg = require('../properties')
, exApi = require('./exnodeApi')
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
    return this._call("itembasket", { apiKey : key });
  },
  getMetaData : function(key , idlist) {
    return this._call("metadata",{apiKey : key , node : 'EE', 'datasetName' : "LANDSAT_8"  , "entityIds" : idlist});
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
//       //console.log(JSON.stringify(r.data.orderItemBasket,null));
//       var items = r.data.orderItemBasket;
//       items.forEach(function(x) {
//         var idArr = x.orderScenes.map(function(x) { return x.entityId;});
//         usgsapi.getMetaData(usgsKey,idArr)
//           .then(function(res) {
//             console.log("Metadata " , res);
//             exApi.getExnodeDataIfPresent(idArr , function(arr){
//               console.log("Not present " , arr);
//             }, function(arr) {
//               console.log("Present " , arr);
//             })
//           });
//       });
//       //console.log(JSON.stringify(r.data.bulkDownloadItemBasket,null));
//     });
    
//   });


module.exports = usgsapi;
