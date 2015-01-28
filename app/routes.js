/*
 * API and Browser Routes
 * app/
 * routes.js
 */
var path = require('path')
  , http = require('http')
  , https = require('https')
  , url = require('url')
  , cfg = require('../properties')
  ,_ = require('underscore')
  ,q = require('q');

var getHttpOptions = cfg.getHttpOptions;

// production
var production = false;
var unis_host = cfg.unis.default.url;
var unis_port = cfg.unis.default.port;
var prodOptions = cfg.prodOptions;
// var slice_info = [];
// var filePath = '/usr/local/etc/node.info';
// var slice_uuid = '';
// var os_name = '';
// var distro = '';

var ms_host = 'dev.incntre.iu.edu' ; //'monitor.incntre.iu.edu';//'dlt.incntre.iu.edu';
var ms_port = '8888'; //9001';

module.exports = function(app) {
  console.log("UNIS Instance: " + unis_host + "@" + unis_port);
  console.log("Measurement Store Host: " + ms_host);
  console.log("Measurement Store Port: " + ms_port);

  if(production) {
    console.log('Running in Production');
  } else {
    console.log('Running in Development');
  }

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

    res.json(routes);
  });

  /*app.get('/api/slice', function(req, res) {
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    // console.log('BODY: ' + JSON.stringify(res.body));

    console.log(slice_info);
    res.json(slice_info);
  });*/
  
  function registerGenericHandler (options) {
      var method = http;
      var res = options.res , req = options.req ;
      options.req = options.res = undefined;

      var keyArr = [].concat(options.key)
      , certArr = [].concat(options.concat) 
      , isHttpsArr = [].concat(options.isHttpsArr)
      , hostArr = [].concat(options.hostname)
      , portArr = [].concat(options.port);
      // Loop over all options path 
      //console.log("Requesting from " ,hostArr);
      var handlerArr = hostArr.map(function(x,index){
          // Return handler function for each 
          var method = http ;  
          if (isHttpsArr[index]) {
              options = _.extend(options,prodOptions);          
              method = https;
          }          
          var opt = _.extend({},options);        
          opt.hostName = x;
          opt.port = portArr[index];    
          opt.key = keyArr[index] || keyArr[0];
          opt.cert = certArr[index] || certArr[0];
          return function(){
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
  };

  app.get('/api/nodes', function(req, res) {
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    // console.log('BODY: ' + JSON.stringify(res.body));
    var options = _.extend({
        req : req , res : res ,
        path : '/nodes',
        name : 'nodes'
    },getHttpOptions());      
    registerGenericHandler(options);
  });

  app.get('/api/nodes/:id', function(req, res) {
    console.log("node id: " + req.params.id);
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    // console.log('BODY: ' + JSON.stringify(res.body));
    var node_id = req.params.id;
    var method = http;
    var options = _.extend({
        req : req , res : res ,
        name: "nodesId",
        path: '/nodes/' + node_id
    },getHttpOptions());  
    registerGenericHandler(options);    
  });

  app.get('/api/services', function(req, res) {
    console.log('STATUS: ' + res.statusCode);
    console.log('HEADERS: ' + JSON.stringify(res.headers));
    console.log('BODY: ' + JSON.stringify(res.body));
    var node_id = req.params.id;
    var method = http;
    var options = _.extend({
        req : req , res : res ,
        name: "services",
        path: '/services'
    },getHttpOptions());
    registerGenericHandler(options);
  });

  app.get('/api/services/:id', function(req, res) {
    console.log("service id: " + req.params.id);
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    // console.log('BODY: ' + JSON.stringify(res.body));
    var service_id = req.params.id;
    var method = http;
    var options = _.extend({
        req : req , res : res ,
        name: "servicesId",
        path: '/services/' + service_id
    },getHttpOptions());  
    registerGenericHandler(options);
  });

  app.get('/api/measurements', function(req, res) {
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    // console.log('BODY: ' + JSON.stringify(res.body));
    var method = http;
    var options = _.extend({
        req : req , res : res ,
        name : "measurements",
        path: '/measurements'
    },getHttpOptions());  
    registerGenericHandler(options);
  });

  app.get('/api/measurements/:id', function(req, res) {
    console.log("measurement id: " + req.params.id);
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    // console.log('BODY: ' + JSON.stringify(res.body));

    var measurement_id = req.params.id;
    var method = http;
    var options = _.extend({
        req : req , res : res ,
        name: "measurementsId",
        path: '/measurements'
    },getHttpOptions());  
    registerGenericHandler(options);
  });

  app.get('/api/metadata', function(req, res) {
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    // console.log('BODY: ' + JSON.stringify(res.body));
    var method = http;
    var options = _.extend({
        req : req , res : res ,
        name: "metadata",
        path: '/metadata'
    },getHttpOptions());     
    registerGenericHandler(options);
  });

  app.get('/api/metadata/:id', function(req, res) {
    console.log("metadata id: " + req.params.id);
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    // console.log('BODY: ' + JSON.stringify(res.body));
    var metadata_id = req.params.id;
    var method = http;
    var options = _.extend({
        req : req , res : res ,
        name: "metadataId",
        path: '/metadata/' + metadata_id
    },getHttpOptions());    
    registerGenericHandler(options);
  });

  app.get('/api/data', function(req, res) {
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    // console.log('BODY: ' + JSON.stringify(res.body));
    var method = http;
    var options = _.extend({
        req : req , res : res ,
        name: "data",
        path: '/data'
    },getHttpOptions({
        isMs : true
    }));
    registerGenericHandler(options);
  });

  app.get('/api/data/:id', function(req, res) {
    console.log("data id: " + req.params.id);
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    // console.log('BODY: ' + JSON.stringify(res.body));
    var data_id = req.params.id;
    var method = http;
    var options = _.extend({
        req : req , res : res ,
        name: "dataId",
        path: '/data/' + data_id
    },getHttpOptions({
        isMs : true 
    }));  
    registerGenericHandler(options);
  });

  app.get('/api/ports', function(req, res) {
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    // console.log('BODY: ' + JSON.stringify(res.body));
    var method = http;
    var options = _.extend({
        req : req , res : res ,
        name: "ports",
        path: '/ports'
    },getHttpOptions());  
    registerGenericHandler(options);
  });

  app.get('/api/ports/:id', function(req, res) {
    console.log("data id: " + req.params.id);
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    // console.log('BODY: ' + JSON.stringify(res.body));

    var port_id = req.params.id;
    var method = http;
    var options = _.extend({
        req : req , res : res ,
        path: '/ports/' + port_id,
        name: "portsId"
    },getHttpOptions());  
    registerGenericHandler(options);    
  });

  app.get('*', function(req, res) {
    res.sendfile('./public/index.html');
  });

};
