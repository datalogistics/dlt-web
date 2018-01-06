/*
 * API and Browser Routes
 * app/
 * routes.js
 */
var path = require('path')
, fs = require('fs')
, readline = require('readline')
, https = require('https')
, url = require('url')
, cfg = require('../properties')
, util = require('util')
, _ = require('underscore')
, querystring = require('querystring')
, xmlparse = require('xml2js').parseString
, request = require('request')
, ejs = require('ejs')
, usgsapi = require('./usgsapi')
, getVersion = require('./getVersion').getVersion
, auth = require('./auth')
, routeCb = require('./routeCb')
, q = require('q');
var tough = require('tough-cookie');
var resourceHelper = require('./resourceHelper');
var getOptions = resourceHelper.getOptions;
var getHttpOptions = resourceHelper.getHttpOptions;
var sslOptions = cfg.sslOptions;
var filterMap = cfg.filterMap;

function applyRouteCbs(name,json) {
  var rcb = routeCb[cfg.routeCb[name]];
  if (typeof rcb == "function") {
    return rcb(json);
  }
  return q.thenResolve();
}
function getJarFromReq(name,req) {
  if (!req.session || !req.session.jar || !req.session.jar[name])
    return null;
  var storeJson = JSON.parse(JSON.stringify(req.session.jar[name]));
  var st = new tough.MemoryCookieStore();
  tough.CookieJar.deserializeSync(storeJson,st);
  var jar = request.jar(st); //
  return jar;
}
function getMostRecent(items) {
  var recent = {}
  items.forEach(function(e) {
    var prev = recent[e.id] || e
    if (prev.ts && e.ts && e.ts > prev.ts) {prev = e}
    recent[e.id] = e
  })
  return Object.keys(recent).map(k => recent[k])
}

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
    routes.push('https://' + hostname + pathname + '/nodes');
    routes.push('https://' + hostname + pathname + '/domains');
    routes.push('https://' + hostname + pathname + '/services');
    routes.push('https://' + hostname + pathname + '/measurements');
    routes.push('https://' + hostname + pathname + '/metadata');
    routes.push('https://' + hostname + pathname + '/data');
    routes.push('https://' + hostname + pathname + '/links');
    routes.push('https://' + hostname + pathname + '/ports');
    routes.push('https://' + hostname + pathname + '/exnodes');
    routes.push('https://' + hostname + pathname + '/fileTree');
    routes.push('https://' + hostname + pathname + '/getVersion');
    routes.push('https://' + hostname + pathname + '/topologies');
    routes.push('https://' + hostname + pathname + '/wildfire');
    routes.push('https://' + hostname + pathname + '/host.cgi');
    res.json(routes);
  });

  function getHostOpt(name) {
    if (!name)
      return null;
    // returns the host name as per url or name
    var prop = cfg.serviceMap;
    var u = url.parse(name);
    var ret;
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

  function reduceValues(data) {
    var json = data.reduce(function(x,y){
      return x.concat(y.value || {});
    },[]);
    return json;
  }

  function getInlineObjects(obj) {
    var base_schemas = Object.keys(cfg.SCHEMAS).reduce(function(obj,key) {
      obj[ cfg.SCHEMAS[key] ] = key;
      return obj;
    }, {});

    function getBaseSchema(so) {
      // process object if we're already a base type
      if (so.$schema in base_schemas) {
	return q.resolve(so.$schema);
      }

      function recurseOnSchema(s) {
	return doGET({url: s}).then(function(data) {
	  if ("allOf" in data.data) {
	    var inherited = data.data.allOf[0].$ref;
	    if (inherited in base_schemas) {
	      return q.resolve(inherited);
	    }
	    else {
	      return recurseOnSchema(inherited);
	    }
	  }
	  else {
	    return q.resolve('undefined');
	  }
	});
      }
      return recurseOnSchema(so.$schema);
    }

    function getObject(o) {
      return getBaseSchema(o).then(function(btype) {
	// base case
	if (! (btype in cfg.recurse_map)) {
	  return q.resolve(o)
	}
	var rlist = cfg.recurse_map[btype];
	// query each recursable element
	var rgets = [];
	rlist.forEach(function(r) {
	  if (r in o) {
	    o[r].forEach(function(e) {
	      if ("href" in e && "rel" in e && e.rel == "full") {
		// TODO: aggregate queries based on endpoint
		//var u = url.parse(e.href);
		var op = {url: e.href}
		rgets.push(doGET(op,r));
	      }
	    })
	  }
	})
	// resolve our promises and process
	return q.allSettled(rgets).then(function(data) {
	  var ndata = {};
	  data.forEach(function(x) {
	    // skip any failed promises (i.e., bad doGETs)
	    if (x.state != "fulfilled") {
	      return;
	    }
	    // skip hrefs that resolve to empty arrays, meaning object no longer exists
	    if (Array.isArray(x.value.data)) {
	      return;
	    }
	    if (x.value.header in ndata) {
	      ndata[x.value.header].push(x.value.data);
	    }
	    else {
	      ndata[x.value.header] = [x.value.data];
	    }
	  })
	  var proms = [];
	  for (var k in ndata) {
	    o[k] = ndata[k];
	    proms.push(stepObjects(ndata[k]));
	  }
	  return q.allSettled(proms).then(function() {
	    return q.resolve(o);
	  });
	});
      });
    }

    function stepObjects(data) {
      var promises = [];
      data.forEach(function(o) {
	promises.push(getObject(o));
      });
      return q.allSettled(promises).then(function(data) {
	return q.resolve(reduceValues(data));
      });
    }
    return stepObjects(obj);
  }

  function doGET(op,key) {
    var defer = q.defer();
    var fdata = "";
    try {
      request.get(op).on('data',function(data) {
	data = data.toString();
	fdata = fdata + data;
      }).on('end',function() {
	try {
          var obj = {"header": key,
		     "data": JSON.parse(fdata)};
          return defer.resolve(obj);
	} catch (e) {
          console.log("Error parsing JSON from socket: ",e);
          return defer.reject(e);
	}
      }).on('error',function() {
	defer.reject(false);
      });
    } catch(e) {
      console.log("request.get error for \""+op.url+"\": ",e);
      defer.reject(e);
    }
    return defer.promise;
  }

  function registerGenericHandler(options,cb) {
    var method = https;
    var res = options.res, req = options.req;
    options.req = options.res = undefined;
    var keyArr = [].concat(options.keyArr)
    , certArr = [].concat(options.certArr)
    , doSSLArr = [].concat(options.doSSLArr)
    , hostArr = [].concat(options.hostArr)
    , portArr = [].concat(options.portArr)
    , nameArr = [].concat(options.nameArr);

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
      if (doSSLArr[index]) {
        options = _.extend(options, sslOptions);
      }
      var opt = _.extend({}, options);
      // Adding parameters got
      opt.hostname = hostArr[index];
      opt.port = portArr[index];
      opt.use_ssl = doSSLArr[index];
      if (certArr[index]) {
        opt.cert = fs.readFileSync(certArr[index]);
      }
      if (keyArr[index]) {
        opt.key = fs.readFileSync(keyArr[index]);
      }
      return function() {
        var j = getJarFromReq(nameArr[index],req);
        var prot = "http://";
        if (opt.use_ssl) {
          prot = "https://";
        }
        var op = {
          url : prot + opt.hostname+":"+opt.port+opt.path,
          jar : j
        };
        if (opt.cert) {
          op.agentOptions = {
            cert : opt.cert,
            key : opt.key,
            requestCert : true,
            rejectUnauthorized : false
          };
        }
	return doGET(op);
      };
    });

    q.allSettled(handlerArr.map(function(x) {return x()})).then(function(obj) {
      var isErr = true ;
      var json = obj.reduce(function(x,y){
        isErr = isErr && y.state =='rejected';
        return x.concat(y.value.data || {});
      },[]);

      function finish(ret) {
        // Now process this return object and apply any CBs if set in cfg
        applyRouteCbs(options.name,ret).then(function() {
	  if (cb) {
	    cb(ret);
	  }
          res.json(ret);
        });
      }

      if (!isErr) {
	if (options.inline) {
	  getInlineObjects(json).then(function(inl) {
	    //console.log(JSON.stringify(inl, null, 2));
	    finish(inl);
	  });
	}
	else{
	  finish(json);
	}
      }
      else {
        res.sendStatus(404);
      }
    });
  };

  function getGenericHandler(opt) {
    var path = opt.path;
    var name = opt.name;
    var handler = opt.handler;

    return function(req, res) {
      // Get all parameters and just forward it to UNIS
      var paramString = querystring.stringify(req.query);
      if (path in filterMap) {
	paramString += "&"+filterMap[path]
      }
      // console.log('STATUS: ' + res.statusCode);
      // console.log('HEADERS: ' + JSON.stringify(res.headers));
      // console.log('BODY: ' + JSON.stringify(res.body));
      var fullpath = "/" + path + "?" + paramString;
      console.log("GETTING: ", fullpath)
      var options = _.extend({
        req : req , res : res ,
        path : fullpath,
        name : name
      },getHttpOptions({
        name : name
      }));
      opt.handler = opt.handler || registerGenericHandler;
      opt.handler(options);
    }
  }

  app.get('/api/probes', getGenericHandler({path : 'probes', name : 'probes'}));
  app.get('/api/topologies', getGenericHandler({path : 'topologies', name : 'topologies'}));
  app.get('/api/domains', getGenericHandler({path : 'domains', name : 'domains'}));
  app.get('/api/nodes', getGenericHandler({path : 'nodes', name : 'nodes'}));
  app.get('/api/links', getGenericHandler({path : 'links', name : 'links'}));
  app.get('/api/paths', getGenericHandler({path : 'paths', name : 'paths'}));
  app.get('/api/services', getGenericHandler({path : 'services', name : 'services'}));
  app.get('/api/exnodes', getGenericHandler({path : 'exnodes', name : 'exnodes'}));
  app.get('/api/measurements', getGenericHandler({path : 'measurements', name : 'measurements'}));
  app.get('/api/metadata', getGenericHandler({path : 'metadata', name : 'metadata'}));
  app.get('/api/data', getGenericHandler({path : 'data', name : 'data'}));
  app.get('/api/ports', getGenericHandler({path : 'ports', name : 'ports'}));
  app.get('/api/topologies', getGenericHandler({path : 'topologies', name : 'topologies'}));

  function getGenericHandlerWithId(opt) {
    var path = opt.path;
    var name = opt.name;
    var handler = opt.handler;
    return function(req, res) {
      // Get all parameters and just forward it to UNIS
      var paramString = querystring.stringify(req.query);
      //console.log("node id: " + req.params.id);
      //console.log('STATUS: ' + res.statusCode);
      //console.log('HEADERS: ' + JSON.stringify(res.headers));
      //console.log('BODY: ' + JSON.stringify(res.body));
      var node_id = req.params.id;
      var inline = ('inline' in req.query) ? true : false;
      var fullpath = "/" + path + '/' + node_id + '?' + paramString
      var options = _.extend({
        req : req , res : res ,
        name: name+"Id"+ "?" + paramString,
        path: fullpath,
	inline: inline
      },getHttpOptions({
        name : name + "_id"
      }));
      opt.handler = opt.handler || registerGenericHandler;
      opt.handler(options);
    };
  };

  app.get('/api/domains/:id', getGenericHandlerWithId({path : 'domains', name : 'domains'}));
  app.get('/api/nodes/:id', getGenericHandlerWithId({path : 'nodes', name : 'nodes'}));
  app.get('/api/services/:id', getGenericHandlerWithId({path : 'services', name : 'services'}));
  app.get('/api/exnodes/:id', getGenericHandlerWithId({path : 'exnodes', name : 'exnodes'}));
  app.get('/api/topologies/:id', getGenericHandlerWithId({path : 'topologies', name : 'topologies'}));
  app.get('/api/measurements/:id', getGenericHandlerWithId({path : 'measurements', name : 'measurements'}));
  app.get('/api/metadata/:id', getGenericHandlerWithId({path : 'metadata', name : 'metadata'}));
  app.get('/api/data/:id', getGenericHandlerWithId({path : 'data', name : 'data'}));
  app.get('/api/links/:id', getGenericHandlerWithId({path : 'links', name : 'links'}));
  app.get('/api/ports/:id', getGenericHandlerWithId({path : 'ports', name : 'ports'}));
  app.get('/api/topologies/:id', getGenericHandlerWithId({path : 'topologies', name : 'topologies'}));
  app.get('/api/getVersion',function(req,res) {
    var host , port ;
    if (req.query.host && req.query.port) {
      host = req.query.host;
      port = req.query.port;
    } else if (req.query.url) {
      var ibpurl = req.query.url;
      var urlData = url.parse(ibpurl);
      host = urlData.hostname;
      port = urlData.port;
    }
    getVersion(host,port).then(function(data) {
      console.log("API RESONSE: ", res.json(data));
      return res.json(data);
    }).catch(function(x) {
      return res.json( {
      	error : true,
      	data : x
      });
    });
  });
  app.get('/api/fileTree',function(req, res) {
    var id = req.query.id;
    delete req.query.id ;
    if(id ==1) {
      req.query.parent = "null=";
    } else if(id) {
      req.query['parent.href'] = id;
    }
    // Ascending sort by name
    // Since all path and rows have 0 appened to them, so an ordinary string sort will work even though they are numbers
    req.query.sort= "name:1";
    var paramString = querystring.stringify(req.query);
    var arr = [];
    var options = _.extend({
      req : req , res : res ,
      path : '/exnodes?fields=id,name,selfRef,parent,mode,size,created,modified&'+paramString,
      name : 'exnodes'
    },getHttpOptions({
      name : 'exnodes'
    }));

    registerGenericHandler(options, function(obj) {
      // Return matching id children
      arr = getMostRecent(obj).map(function(x) {
        return {
          "id" : x.selfRef,
          "icon" :  x.mode == "file" ? "/images/file.png" : "/images/folder.png",
          "isFile": x.mode == "file" ? true: false,
          "parent" : x.parent == null? "#" : x.parent.href,
          "real_parent" : x.parent == null? "#" : (x.parent.href),
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


  app.get('/api/wildfire/post', function(req, res){
      var url = cfg.idms_server;
      res.json(url);
  });

  app.get('/api/wildfire',function(req, res) {
    var id = req.query.id;
    delete req.query.id ;
    if(id ==1) {
      req.query.parent = "null=";
    } else if(id) {
      req.query['parent.href'] = id;
    }
    // Ascending sort by name
    // Since all path and rows have 0 appened to them, so an ordinary string sort will work even though they are numbers
    req.query.sort= "name:1";
    var paramString = querystring.stringify(req.query);
    var arr = [];
    var options = _.extend({
      req : req , res : res ,
      path : '',
      name : 'wildfire'
    },getHttpOptions({
      name : 'wildfire'
    }));




    registerGenericHandler(options, function(obj) {
      // Return matching id children
      arr = getMostRecent(obj);
      res.json(arr);
    });
  });

  // example API call to host.cgi -> /host.cgi?method=get_summary&host=http://um-ps01.osris.org
  app.get('/api/host.cgi', function(req, res){
    var host = req.query.host;
    var method = req.query.method;
    // http://um-ps01.osris.org/toolkit/services/host.cgi <-- list of possible methods to query for.
    var url = host + '/toolkit/services/host.cgi?method=' + method;
    request(url, function(err, r, response){
      res.json(JSON.parse(response));
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

  app.get('/api/linkmap',function(req, res) {
    var link_map = {}
    res.json(link_map)
  })

  app.get('/api/natmap',function(req, res) {
    var rmap = {};
    var stream = fs.createReadStream(cfg.nat_map_file)
        .on ("error", function (error){
          console.log (error);
          res.json({});
        })
        .on("end", function () {
          stream.close();
          res.json(rmap);
        });

    var rd = readline.createInterface({
      input: stream,
      output: process.stdout,
      terminal: false
    });

    rd.on('line', function(line) {
      if (line[0] != '#') {
        var ary = line.split(':');
        if (ary[4]) {
          rmap[ary[4]] = {
            'data_ip' : ary[0],
            'internal': ary[1],
            'port'    : ary[2],
            'external': ary[3]
          };
        }
      }
    });
  });

  auth.addRoutes('/',app);
  usgsapi.addRoutes('/usgsapi/',app);
  app.get('/popup/*', function(req,res) {
    res.render('../views/popup.html');
  });
  var viewsFolder = "../views";
  app.get('*.html',function(req,res) {
    res.render(path.join(viewsFolder,req.url));
  });
  app.get('*.ejs',function(req,res) {
    res.render(path.join(viewsFolder,req.url));
  });
  app.get('*', function(req, res) {
    res.render(path.join(viewsFolder,'index.ejs'));
  });
};
