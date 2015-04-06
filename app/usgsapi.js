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
    var jsonStr = JSON.stringify(params);
    request.get(baseurlHtpps + name + '?jsonRequest='+jsonStr  , function(err,r,resp) {      
      cb.apply(this,arguments);
    });
  },
  login : function(uname,pwd) {
    var json = {
      username : uname ,
      password : pwd
    };
    this._call("login",{ username : uname , password: pwd } , function(err,r,resp){
      console.log(resp);
    });    
  },
  logout  : function(key) {
    this._call("logout",{ apiKey : key } , function(err,r,resp){
      console.log(resp);
    });
  },
  getShoppingCart : function(key) {
    this._call("itembasket", { apiKey : key } , function(err,r,resp){
      console.log(resp);
    });
  },
  clearCart : function(key , node , datasetName ) {  
    this._call("clearorder", { apiKey : key, node : node , datasetName : datasetName} , function(err,r,resp){
      console.log(resp);
    });
  }
};

usgsapi.login("indianadlt","indiana2014");
