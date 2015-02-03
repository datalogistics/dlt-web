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
  , _ = require('underscore')
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
      var res = options.res, req = options.req;
      options.req = options.res = undefined;

      var keyArr = [].concat(options.keyArr)
      , certArr = [].concat(options.certArr)
      , doSSLArr = [].concat(options.doSSLArr)
      , hostArr = [].concat(options.hostArr)
      , portArr = [].concat(options.portArr);
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
          opt.hostname = hostArr[index];
          opt.port = portArr[index];
	  if (certArr[index]) {
              opt.cert = fs.readFileSync(certArr[index]);
	  }
	  if (keyArr[index]) {
              opt.key = fs.readFileSync(keyArr[index]);
	  }
          return function(){
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
    },getHttpOptions({
        name : 'nodes'
    }));      
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
    },getHttpOptions({
        name : 'nodes_id'
    }));  
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
        path: '/services?fields=id'
    },getHttpOptions({
        name : 'services'
    }));
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
    },getHttpOptions({
        name : 'services_id'
    }));  
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
    },getHttpOptions({
        name : 'measurements'
    }));  
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
    },getHttpOptions({
        name : 'measurements_id'
    }));  
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
    },getHttpOptions({
        name : 'metadata'
    }));     
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
    },getHttpOptions({
        name : 'metadata_id'
    }));    
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
        name : 'data',
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
        name : 'data_id',
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
    },getHttpOptions({
        name : 'ports'
    }));  
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
    },getHttpOptions({
        name : 'ports_id'
    }));  
    registerGenericHandler(options);    
  });

  app.get('*', function(req, res) {
    res.sendfile('./public/index.html');
  });

};
