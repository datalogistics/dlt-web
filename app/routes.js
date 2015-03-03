/*
 * API and Browser Routes
 * app/
 * routes.js
 */
var path = require('path')
, fs = require('fs')
, http = require('http')
, https = require('https')
, url = require('url')
, cfg = require('../properties')
, util = require('util')
, _ = require('underscore')
, querystring = require('querystring')
, xmlparse = require('xml2js').parseString
, request = require('request')
, ejs = require('ejs')
, q = require('q');

var getHttpOptions = cfg.getHttpOptions;
var sslOptions = cfg.sslOptions;

// var slice_info = [];
// var filePath = '/usr/local/etc/node.info';
// var slice_uuid = '';
// var os_name = '';
// var distro = ''; 

module.exports = function(app) {
  console.log("UNIS Default Instances: " + cfg.routeMap.default);
  //console.log("Measurement Store Host: " + ms_host);
  //console.log("Measurement Store Port: " + ms_port);
  
  app.get('/api', function(req, res) {
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    // console.log('BODY: ' + JSON.stringify(res.body));
    
    var routes = [];
    var hostname = req.headers.host;
    var pathname = url.parse(req.url).pathname;
    
    // routes.push('http://' + hostname + pathname + '/slice');
    routes.push('http://' + hostname + pathname + '/nodes');
    routes.push('http://' + hostname + pathname + '/services');
    routes.push('http://' + hostname + pathname + '/measurements');
    routes.push('http://' + hostname + pathname + '/metadata');
    routes.push('http://' + hostname + pathname + '/data');
    routes.push('http://' + hostname + pathname + '/ports');
    routes.push('http://' + hostname + pathname + '/exnodes');
    routes.push('http://' + hostname + pathname + '/fileTree');
    res.json(routes);
  });
  
  function getHostOpt(name) {
    if (!name)
      return;
    // returns the host name as per url or name
    var prop = cfg.serviceMap;
    var u = url.parse(name);
    var ret ;        
    for (var i in prop) {
      var it = prop[i];          
      var uH = u.host || u.href ;
      var iA = (it.url || "").split(uH || "") ;            
      if(((it.url + "").indexOf(uH + "")) != -1) {
        ret = it;
        var propUrl = url.parse(it.url || "");                
        if (propUrl.host == it.host && it.protocol == propUrl.protocol) {
          return ret;
        } // Else look for a better match
      }                         
    }
    return ret;
  };
  
  function registerGenericHandler (options,cb) {
    var method = http;
    var res = options.res, req = options.req;
    options.req = options.res = undefined;
    var keyArr = [].concat(options.keyArr)
    , certArr = [].concat(options.certArr)
    , doSSLArr = [].concat(options.doSSLArr)
    , hostArr = [].concat(options.hostArr)
    , portArr = [].concat(options.portArr);        
    // Select host to be queried 
    var host = req.query.hostname;
    var opt = getHostOpt(host);
    if (opt) {
      // Copy options from array and make it the only opt
      hostArr = [opt.url];
      keyArr = [opt.key]
      , certArr = [opt.cert]
      , doSSLArr = [opt.use_ssl]
      , portArr = [opt.port];        
    }; 
    //console.log("**" , hostArr , keyArr , certArr , doSSLArr , portArr );
    // Loop over all options path 
    //console.log("Requesting from ", hostArr, certArr);
    var handlerArr = hostArr.map(function(x,index) {
      // Return handler function for each 
      var method = http;
      if (doSSLArr[index]) {
        options = _.extend(options, sslOptions);
        method = https;
      }
      var opt = _.extend({}, options);
      // Adding parameters got 
      opt.hostname = hostArr[index];
      opt.port = portArr[index];
      if (certArr[index]) {
        opt.cert = fs.readFileSync(certArr[index]);
      }
      if (keyArr[index]) {
        opt.key = fs.readFileSync(keyArr[index]);
      }
      return function() {
	//console.log(opt);
        var defer = q.defer();
        method.get(opt, function(http_res) {
          var data = '';
          http_res.on('data', function (chunk) {
            data += chunk;
          });
          http_res.on('end',function() {
            var obj = JSON.parse(data);
            // console.log( obj );
            return defer.resolve(obj);
            //res.json( obj );
          });
          http_res.on('error',function(e) {
            return defer.reject(false);
            // res.send( 404 );
          });
        });
        return defer.promise;
      };
    });
    if (cb) {
      q.allSettled(handlerArr.map(function(x) {return x()})).then(function(obj){
        cb(obj);
      });
    } else {
      q.allSettled(handlerArr.map(function(x) {return x()})).then(function(obj){
        var isErr = true ;
        var json = obj.reduce(function(x,y){
          isErr = isErr && y.state =='rejected';
          return x.concat(y.value || {});
        },[]);
        if (!isErr) {
          res.json(json);
        } else {
          res.send(404);
        }
      });
      
    }
  };
  
  function getGenericHandler(opt) {
    var path = opt.path , name = opt.name ;
    var handler = opt.handler;
    
    return function(req, res) {
      // Get all parameters and just forward it to UNIS 
      var paramString = querystring.stringify(req.query);
      // console.log('STATUS: ' + res.statusCode);
      // console.log('HEADERS: ' + JSON.stringify(res.headers));
      // console.log('BODY: ' + JSON.stringify(res.body));
      var options = _.extend({
        req : req , res : res ,
        path : path + "?" + paramString,
        name : name
      },getHttpOptions({
        name : name
      }));      
      registerGenericHandler(options);
    }
  }
  app.get('/api/nodes', getGenericHandler({path : '/nodes', name : 'nodes' , handler : registerGenericHandler}));
  app.get('/api/services', getGenericHandler({path : '/services', name : 'services' , handler : registerGenericHandler}));
  app.get('/api/exnodes', getGenericHandler({path : '/exnodes', name : 'exnodes' , handler : registerGenericHandler}));
  app.get('/api/measurements', getGenericHandler({path : '/measurements', name : 'measurements' , handler : registerGenericHandler}));
  app.get('/api/metadata', getGenericHandler({path : '/metadata', name : 'metadata' , handler : registerGenericHandler}));
  app.get('/api/data', getGenericHandler({path : '/data', name : 'data' , handler : registerGenericHandler}));
  app.get('/api/ports', getGenericHandler({path : '/ports', name : 'ports' , handl : registerGenericHandler}));
  
  function getGenericHandlerWithId(opt) {
    var path = opt.path , name = opt.name ;
    var handler = opt.handler;
    return function(req, res) {
      // Get all parameters and just forward it to UNIS 
      var paramString = querystring.stringify(req.query);
      console.log("node id: " + req.params.id);
      // console.log('STATUS: ' + res.statusCode);
      // console.log('HEADERS: ' + JSON.stringify(res.headers));
      // console.log('BODY: ' + JSON.stringify(res.body));
      var node_id = req.params.id;
      var method = http;
      var options = _.extend({
        req : req , res : res ,
        name: name+"Id"+ "?" + paramString,
        path: path + '/' + node_id + '?' + paramString
      },getHttpOptions({
        name : name + "_id"
      }));  
      registerGenericHandler(options);    
    };
  };
  app.get('/api/nodes/:id', getGenericHandlerWithId({path : '/nodes', name : 'nodes' , handler : registerGenericHandler}));
  app.get('/api/services/:id', getGenericHandlerWithId({path : '/services', name : 'services' , handler : registerGenericHandler}));
  app.get('/api/exnodes/:id', getGenericHandlerWithId({path : '/exnodes', name : 'exnodes' , handler : registerGenericHandler}));
  app.get('/api/measurements/:id', getGenericHandlerWithId({path : '/measurements', name : 'measurements' , handler : registerGenericHandler}));
  app.get('/api/metadata/:id', getGenericHandlerWithId({path : '/metadata', name : 'metadata' , handler : registerGenericHandler}));
  app.get('/api/data/:id', getGenericHandlerWithId({path : '/data', name : 'data' , handler : registerGenericHandler}));
  app.get('/api/ports/:id', getGenericHandlerWithId({path : '/ports', name : 'ports' , handler : registerGenericHandler}));
  
  app.get('/api/fileTree',function(req, res) {
    var id = req.query.id;
    delete req.query.id ;
    if(id ==1) {
      req.query.parent = "null=";
    } else if(id) {
      req.query.parent = id;
    }
    var paramString = querystring.stringify(req.query);
    var arr = [];
    var options = _.extend({
      req : req , res : res ,
      path : '/exnodes?'+paramString,
      name : 'exnodes'
    },getHttpOptions({
      name : 'exnodes'
    }));      
    registerGenericHandler(options, function(obj){
      var exjson =  obj[0].value;
      // Return matching id children
      arr = exjson.map(function(x){            
        return {
          "id" : x.id ,
          "icon" :  x.mode == "file" ? "/images/file.png" : "/images/folder.png",
	  "isFile": x.mode == "file" ? true: false,
          "parent" : x.parent == null? "#" : x.parent,
          "children" :  x.mode != "file",
          "undetermined" : true,
          "state" : {
            "opened" : false ,
            "disabled" : false,
            "selected" : false 
          },
          "selfRef" : x.selfRef,
          "text" : x.name ,
          "size" : x.size , 
          "created" : x.created,
          "modified" : x.modified
        };
      });
      res.json(arr);
    });     
  });


  // Will do some refractoring a little later
  app.get('/api/usgsrowsearch',function(req, res) {
    var params = req.query;
    var paramString = querystring.stringify(req.query);
    // Make a request to the USGS get_metadata url which returns the data in xml form
    var url = cfg.usgs_row_searchurl + "?"+paramString;
    console.log(url);
    request(url,function(err,r,resp){
      xmlparse(resp, function(err , result){
        console.dir(result);                
        res.json(result);
      });
    });        
  });

  app.get('/api/usgslatsearch',function(req, res) {
    var params = req.query;
    var paramString = querystring.stringify(req.query);
    // Make a request to the USGS get_metadata url which returns the data in xml form
    var url = cfg.usgs_lat_searchurl + "?"+paramString;
    console.log(url);
    request(url,function(err,r,resp){
      xmlparse(resp, function(err , result){
        console.dir(result);                
        res.json(result);
      });
    });
  });
  
  app.post('/api/download',function(req, res){
    var sessionId = req.sessionID;
    var arr = req.body.refList.split(",");
    var app = req.body.app;
    var jmap = cfg.jnlpMap[app];
    ejs.renderFile(jmap.template, _.extend(jmap,{
      jarname: jmap.jarfile,
      sessionID : sessionId,
      codebase: jmap.codebase,
      args : arr}), function(err, html) {
	res.set('Content-Type','data/jnlp');
	res.set('Content-Disposition',"attachment; filename=dlt-client.jnlp");
	res.end(html);
      });
  });

  app.get('*', function(req, res) {
    res.sendfile('./public/index.html');
  });
};
