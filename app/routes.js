/*
 * API and Browser Routes
 * app/
 * routes.js
 */

var fs = require('fs')
  , path = require('path')
  , http = require('http')
  , https = require('https')
  , url = require('url');

// production
var production = true;
var unis_host = 'dlt.incntre.iu.edu';
var unis_port = '9000';
var unis_cert = './dlt-client.pem';
var unis_key = './dlt-client.pem';

// var slice_info = [];
// var filePath = '/usr/local/etc/node.info';
// var slice_uuid = '';
// var os_name = '';
// var distro = '';

var ms_host = 'dlt.incntre.iu.edu';
var ms_port = '9001';

module.exports = function(app) {

  console.log("UNIS Instance: " + unis_host + "@" + unis_port);
  console.log("Measurement Store Host: " + ms_host);
  console.log("Measurement Store Port: " + ms_port);

  if(production) {
    console.log('Running in Production');
  } else {
    console.log('Running in Development');
  }

  /*var exec = require('child_process').exec;
  var child1, child2;

  child1 = exec('uname -s',
    function (error, stdout, stderr) {
      os_name = stdout;
      if (error !== null) {
        console.log('exec error: ' + error);
      }
  });

  child2 = exec('head -1 /etc/issue',
    function (error, stdout, stderr) {
      distro = stdout;
      if (error !== null) {
        console.log('exec error: ' + error);
      }
  });

  fs.readFile(filePath, {encoding: 'utf-8'}, function(err, data) {
    if (err) {
      console.log('file read error: ' + err);
    } else {
      var fileData = data.toString().split('\n');
      var split, project, slice, gn, exAddy, ms_url, unis;

      for(line in fileData) {
        split = fileData[line].split('=');

        if(split[0] === 'external_address')
          exAddy = split[1];

        if (split[0] === 'gn_address')
          gn = split[1];

        if(split[0] === 'unis_instance')
          unis = split[1];

        if(split[0] === 'ms_instance') {
          ms_url = split[1];
          // ms_port = ms_url.split(":")[2];
          console.log("Measurement Store Port: " + ms_port);
          // ms_host = ms_url.split("//")[1].split(":")[0];
          console.log("Measurement Store Host: " + ms_host);
        }

        if (split[0] === 'node_id') {
          project = split[2].split('+');
          slice = project[3].split(':');
        }

        if(split[0] === 'auth_uuid')
          slice_uuid = split[1];
      }
      slice_info.push({'external_address': exAddy, 'gn_address': gn, 'unis_instance': unis, 'ms_url': ms_url, 'project': project[1], 'slice': slice[0], 'slice_uuid': slice_uuid, 'os_name': os_name, 'distro': distro});
      // console.log(slice_info);
    }
  });*/

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

  app.get('/api/nodes', function(req, res) {
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    // console.log('BODY: ' + JSON.stringify(res.body));

    if (production) {
      /* HTTPS Options */
      var https_get_options = {
        hostname: unis_host,
        port: unis_port,
        key: fs.readFileSync(unis_key),
        cert: fs.readFileSync(unis_cert),
        requestCert: true,
        rejectUnauthorized: false,
        path: '/nodes',
        method: 'GET',
        headers: {
            'Content-type': 'application/perfsonar+json',
            'connection': 'keep-alive'
        }
      };
      /* GET JSON and Render to our API */
      https.get(https_get_options, function(http_res) {
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
    } else {
      /* HTTP Options */
      var http_get_options = {
        hostname: unis_host,
        port: unis_port,
        path: '/nodes',
        method: 'GET',
        headers: {
            'Content-type': 'application/perfsonar+json',
            'connection': 'keep-alive'
        }
      };
      /* GET JSON and Render to our API */
      http.get(http_get_options, function(http_res) {
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
    }
  });

  app.get('/api/nodes/:id', function(req, res) {
    console.log("node id: " + req.params.id);
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    // console.log('BODY: ' + JSON.stringify(res.body));

    var node_id = req.params.id;

    if (production) {
      /* HTTPS Options */
      var https_get_options = {
        hostname: unis_host,
        port: unis_port,
        key: fs.readFileSync(unis_key),
        cert: fs.readFileSync(unis_cert),
        requestCert: true,
        rejectUnauthorized: false,
        path: '/nodes/' + node_id,
        method: 'GET',
        headers: {
            'Content-type': 'application/perfsonar+json',
            'connection': 'keep-alive'
        }
      };
      /* GET JSON and Render to our API */
      https.get(https_get_options, function(http_res) {
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
    } else {
      /* HTTP Options */
      var http_get_options = {
        hostname: unis_host,
        port: unis_port,
        path: '/nodes/' + node_id,
        method: 'GET',
        headers: {
            'Content-type': 'application/perfsonar+json',
            'connection': 'keep-alive'
        }
      };
      /* GET JSON and Render to our API */
      http.get(http_get_options, function(http_res) {
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
    }
  });

  app.get('/api/services', function(req, res) {
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    // console.log('BODY: ' + JSON.stringify(res.body));

    if (production) {
      /* HTTPS Options */
      var https_get_options = {
        hostname: unis_host,
        port: unis_port,
        key: fs.readFileSync(unis_key),
        cert: fs.readFileSync(unis_cert),
        requestCert: true,
        rejectUnauthorized: false,
        path: '/services?serviceType=ibp_server&fields=id',
        method: 'GET',
        headers: {
            'Content-type': 'application/perfsonar+json',
            'connection': 'keep-alive'
        }
      };
      /* GET JSON and Render to our API */
      https.get(https_get_options, function(http_res) {
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
    } else {
      /* HTTP Options */
      var http_get_options = {
        hostname: unis_host,
        port: unis_port,
        path: '/services?serviceType=ibp_server&fields=id',
        method: 'GET',
        headers: {
            'Content-type': 'application/perfsonar+json',
            'connection': 'keep-alive'
        }
      };
      /* GET JSON and Render to our API */
      http.get(http_get_options, function(http_res) {
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
    }
  });

  app.get('/api/services/:id', function(req, res) {
    console.log("service id: " + req.params.id);
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    // console.log('BODY: ' + JSON.stringify(res.body));

    var service_id = req.params.id;

    if (production) {
      /* HTTPS Options */
      var https_get_options = {
        hostname: unis_host,
        port: unis_port,
        key: fs.readFileSync(unis_key),
        cert: fs.readFileSync(unis_cert),
        requestCert: true,
        rejectUnauthorized: false,
        path: '/services/' + service_id,
        method: 'GET',
        headers: {
            'Content-type': 'application/perfsonar+json',
            'connection': 'keep-alive'
        }
      };
      /* GET JSON and Render to our API */
      https.get(https_get_options, function(http_res) {
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
    } else {
      /* HTTP Options */
      var http_get_options = {
          hostname: unis_host,
          port: unis_port,
          path: '/services/' + service_id,
          method: 'GET',
          headers: {
              'Content-type': 'application/perfsonar+json',
              'connection': 'keep-alive'
          }
      };
      /* GET JSON and Render to our API */
      http.get(http_get_options, function(http_res) {
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
    }
  });

  app.get('/api/measurements', function(req, res) {
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    // console.log('BODY: ' + JSON.stringify(res.body));

    if (production) {
      /* HTTPS Options */
      var https_get_options = {
        hostname: unis_host,
        port: unis_port,
        key: fs.readFileSync(unis_key),
        cert: fs.readFileSync(unis_cert),
        requestCert: true,
        rejectUnauthorized: false,
        path: '/measurements',
        method: 'GET',
        headers: {
            'Content-type': 'application/perfsonar+json',
            'connection': 'keep-alive'
        }
      };
      /* GET JSON and Render to our API */
      https.get(https_get_options, function(http_res) {
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
    } else {
      /* HTTP Options */
      var http_get_options = {
          hostname: unis_host,
          port: unis_port,
          path: '/measurements',
          method: 'GET',
          headers: {
              'Content-type': 'application/perfsonar+json',
              'connection': 'keep-alive'
          }
      };
      /* GET JSON and Render to our API */
      http.get(http_get_options, function(http_res) {
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
    }
  });

  app.get('/api/measurements/:id', function(req, res) {
    console.log("measurement id: " + req.params.id);
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    // console.log('BODY: ' + JSON.stringify(res.body));

    var measurement_id = req.params.id;

    if (production) {
      /* HTTPS Options */
      var https_get_options = {
        hostname: unis_host,
        port: unis_port,
        key: fs.readFileSync(unis_key),
        cert: fs.readFileSync(unis_cert),
        requestCert: true,
        rejectUnauthorized: false,
        path: '/measurements/' + measurement_id,
        method: 'GET',
        headers: {
            'Content-type': 'application/perfsonar+json',
            'connection': 'keep-alive'
        }
      };
      /* GET JSON and Render to our API */
      https.get(https_get_options, function(http_res) {
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
    } else {
      /* HTTP Options */
      var http_get_options = {
        hostname: unis_host,
        port: unis_port,
        path: '/measurements/' + measurement_id,
        method: 'GET',
        headers: {
            'Content-type': 'application/perfsonar+json',
            'connection': 'keep-alive'
        }
      };
      /* GET JSON and Render to our API */
      http.get(http_get_options, function(http_res) {
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
    }
  });

  app.get('/api/metadata', function(req, res) {
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    // console.log('BODY: ' + JSON.stringify(res.body));

    if (production) {
      /* HTTPS Options */
      var https_get_options = {
        hostname: unis_host,
        port: unis_port,
        key: fs.readFileSync(unis_key),
        cert: fs.readFileSync(unis_cert),
        requestCert: true,
        rejectUnauthorized: false,
        path: '/metadata',
        method: 'GET',
        headers: {
            'Content-type': 'application/perfsonar+json',
            'connection': 'keep-alive'
        }
      };
      /* GET JSON and Render to our API */
      https.get(https_get_options, function(http_res) {
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
    } else {
      /* HTTP Options */
      var http_get_options = {
          hostname: unis_host,
          port: unis_port,
          path: '/metadata',
          method: 'GET',
          headers: {
              'Content-type': 'application/perfsonar+json',
              'connection': 'keep-alive'
          }
      };
      /* GET JSON and Render to our API */
      http.get(http_get_options, function(http_res) {
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
    }
  });

  app.get('/api/metadata/:id', function(req, res) {
    console.log("data id: " + req.params.id);
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    // console.log('BODY: ' + JSON.stringify(res.body));

    var metadata_id = req.params.id;

    if (production) {
      /* HTTPS Options */
      var https_get_options = {
        hostname: unis_host,
        port: unis_port,
        key: fs.readFileSync(unis_key),
        cert: fs.readFileSync(unis_cert),
        requestCert: true,
        rejectUnauthorized: false,
        path: '/metadata/' + metadata_id,
        method: 'GET',
        headers: {
            'Content-type': 'application/perfsonar+json',
            'connection': 'keep-alive'
        }
      };
      /* GET JSON and Render to our API */
      https.get(https_get_options, function(http_res) {
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
    } else {
      /* HTTP Options */
      var http_get_options = {
        hostname: unis_host,
        port: unis_port,
        path: '/metadata/' + metadata_id,
        method: 'GET',
        headers: {
            'Content-type': 'application/perfsonar+json',
            'connection': 'keep-alive'
        }
      };
      /* GET JSON and Render to our API */
      http.get(http_get_options, function(http_res) {
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
    }
  });

  app.get('/api/data', function(req, res) {
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    // console.log('BODY: ' + JSON.stringify(res.body));

    if (production) {
      // HTTPS Options
      var https_get_options = {
        hostname: ms_host,
        port: ms_port,
        key: fs.readFileSync(unis_key),
        cert: fs.readFileSync(unis_cert),
        requestCert: true,
        rejectUnauthorized: false,
        path: '/data',
        method: 'GET',
        headers: {
            'Content-type': 'application/perfsonar+json',
            'connection': 'keep-alive'
        }
      };
      // GET JSON and Render to our API
      https.get(https_get_options, function(http_res) {
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
    } else {
      // HTTP Options
      var http_get_options = {
          hostname: ms_host,
          port: ms_port,
          path: '/data',
          method: 'GET',
          headers: {
              'Content-type': 'application/perfsonar+json',
              'connection': 'keep-alive'
          }
      };
      // GET JSON and Render to our API
      http.get(http_get_options, function(http_res) {
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
    }
  });

  app.get('/api/data/:id', function(req, res) {
    console.log("data id: " + req.params.id);
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    // console.log('BODY: ' + JSON.stringify(res.body));

    var data_id = req.params.id;

    if (production) {
      // HTTPS Options
      var https_get_options = {
        hostname: ms_host,
        port: ms_port,
        key: fs.readFileSync(unis_key),
        cert: fs.readFileSync(unis_cert),
        requestCert: true,
        rejectUnauthorized: false,
        path: '/data/' + data_id,
        method: 'GET',
        headers: {
            'Content-type': 'application/perfsonar+json',
            'connection': 'keep-alive'
        }
      };
      // GET JSON and Render to our API
      https.get(https_get_options, function(http_res) {
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
    } else {
      // HTTP Options
      var http_get_options = {
        hostname: ms_host,
        port: ms_port,
        path: '/data/' + data_id,
        method: 'GET',
        headers: {
            'Content-type': 'application/perfsonar+json',
            'connection': 'keep-alive'
        }
      };
      // GET JSON and Render to our API
      http.get(http_get_options, function(http_res) {
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
    }
  });

  app.get('/api/ports', function(req, res) {
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    // console.log('BODY: ' + JSON.stringify(res.body));

    if (production) {
      /* HTTPS Options */
      var https_get_options = {
        hostname: unis_host,
        port: unis_port,
        key: fs.readFileSync(unis_key),
        cert: fs.readFileSync(unis_cert),
        requestCert: true,
        rejectUnauthorized: false,
        path: '/ports',
        method: 'GET',
        headers: {
            'Content-type': 'application/perfsonar+json',
            'connection': 'keep-alive'
        }
      };
      /* GET JSON and Render to our API */
      https.get(https_get_options, function(http_res) {
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
    } else {
      /* HTTP Options */
      var http_get_options = {
          hostname: unis_host,
          port: unis_port,
          path: '/ports',
          method: 'GET',
          headers: {
              'Content-type': 'application/perfsonar+json',
              'connection': 'keep-alive'
          }
      };
      /* GET JSON and Render to our API */
      http.get(http_get_options, function(http_res) {
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
    }
  });

  app.get('/api/ports/:id', function(req, res) {
    console.log("data id: " + req.params.id);
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    // console.log('BODY: ' + JSON.stringify(res.body));

    var port_id = req.params.id;

    if (production) {
      /* HTTPS Options */
      var https_get_options = {
        hostname: unis_host,
        port: unis_port,
        key: fs.readFileSync(unis_key),
        cert: fs.readFileSync(unis_cert),
        requestCert: true,
        rejectUnauthorized: false,
        path: '/ports/' + port_id,
        method: 'GET',
        headers: {
            'Content-type': 'application/perfsonar+json',
            'connection': 'keep-alive'
        }
      };
      /* GET JSON and Render to our API */
      https.get(https_get_options, function(http_res) {
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
    } else {
      /* HTTP Options */
      var http_get_options = {
        hostname: unis_host,
        port: unis_port,
        path: '/ports/' + port_id,
        method: 'GET',
        headers: {
            'Content-type': 'application/perfsonar+json',
            'connection': 'keep-alive'
        }
      };
      /* GET JSON and Render to our API */
      http.get(http_get_options, function(http_res) {
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
    }
  });

  app.get('*', function(req, res) {
    res.sendfile('./public/index.html');
  });

};
