/*
 * API and Browser Routes
 * app/
 * routes.js
 */

var fs = require('fs')
  , path = require('path')
  , http = require('http')
  , https = require('https')
  , url = require('url')
  , cfg = require('../properties')
  ,_ = require('underscore');

var getHttpOptions = cfg.getHttpOptions;

// production
var production = true;
var unis_host = cfg.unis.default.url;
var unis_port = cfg.unis.default.port;
var unis_cert = './dlt-client.pem';
var unis_key  = './dlt-client.pem';

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
  
  function registerGenericHandler (httpOptions) {
      var method = http;
      if (production) {
          options = _.extend(options,prodOptions);
          method = https;
      }

      /* GET JSON and Render to our API */
      method.get(options, function(http_res) {
          var data = '';
          
          http_res.on('data', function (chunk) {
              data += chunk;
          });
          http_res.on('end',function() {
              var obj = JSON.parse(data);
              // console.log( obj );
              res.json( obj );
          });
          http_res.on('error',function() {
              console.log('problem with request: ' + e.message);
              res.send( 404 );
          });
      });      
  };

    
  var prodOptions = {
      key: fs.readFileSync(unis_key),
      cert: fs.readFileSync(unis_cert),
      requestCert: true,
      rejectUnauthorized: false
  };

  app.get('/api/nodes', function(req, res) {
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    // console.log('BODY: ' + JSON.stringify(res.body));
    var options = _.extend({
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
        name: "nodesId",
        path: '/nodes/' + node_id
    },getHttpOptions());  
    registerGenericHandler(options);    
  });

  app.get('/api/services', function(req, res) {
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    // console.log('BODY: ' + JSON.stringify(res.body));
    var node_id = req.params.id;
    var method = http;
    var options = _.extend({
        name: "services",
        path: '/services?fields=id'
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
        path: '/ports/' + port_id,
        name: "portsId"
    },getHttpOptions());  
    registerGenericHandler(options);    
  });

  app.get('*', function(req, res) {
    res.sendfile('./public/index.html');
  });

};
