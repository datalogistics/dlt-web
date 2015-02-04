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

    /*app.get('/api/slice', function(req, res) {
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    // console.log('BODY: ' + JSON.stringify(res.body));

    console.log(slice_info);
    res.json(slice_info);
    });*/
    
    function registerGenericHandler (options,cb) {
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
            // console.log('STATUS: ' + res.statusCode);
            // console.log('HEADERS: ' + JSON.stringify(res.headers));
            // console.log('BODY: ' + JSON.stringify(res.body));
            var options = _.extend({
                req : req , res : res ,
                path : path,
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
            console.log("node id: " + req.params.id);
            // console.log('STATUS: ' + res.statusCode);
            // console.log('HEADERS: ' + JSON.stringify(res.headers));
            // console.log('BODY: ' + JSON.stringify(res.body));
            var node_id = req.params.id;
            var method = http;
            var options = _.extend({
                req : req , res : res ,
                name: name+"Id",
                path: path + node_id
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
        var id = req.query.id || 1;
        var arr = [];
        // Need to handle null case at unis -- TODO delete
        if (id == 1) {
            var options = _.extend({
                req : req , res : res ,
                path : '/exnodes',
                name : 'exnodes'
            },getHttpOptions({
                name : 'exnodes'
            }));      
            registerGenericHandler(options, function(obj){
                var exjson =  obj[0].value;
                // Return matching id children
                exjson.map(function(x){            
                    if(x.parent == null)
                        arr.push({
                            "id" : x.id ,
                            "icon" :  x.mode == "file" ? "/images/file.png" : "/images/folder.png",
                            "parent" : x.parent == null? "#" : x.parent,
                            "children" : true,
                            "state" : {
                                "opened" : false ,
                                "disabled" : false,
                                "selected" : false 
                            },
                            "text" : x.name ,
                            "size" : x.size , 
                            "created" : x.created,
                            "modified" : x.modified
                        });
                });
                res.json(arr);
            });     
        } else {
            var options = _.extend({
                req : req , res : res ,
                path : '/exnodes?parent='+id,
                name : 'exnodes'
            },getHttpOptions({
                name : 'exnodes'
            }));      
            registerGenericHandler(options, function(obj){
                var exjson =  obj[0].value;
                // Return matching id children
                exjson.map(function(x){            
                    arr.push({
                        "id" : x.id ,
                        "parent" : x.parent == null? "#" : x.parent,
                        "icon" :  x.mode == "file" ? "/images/file.png" : "/images/folder.png",
                        "isFile" : x.mode == "file" ,
                        "children" :  x.mode != "file" ,
                        "state" : {
                            "opened" : false ,
                            "disabled" : false,
                            "selected" : false 
                        },
                        "text" : x.name ,
                        "size" : x.size , 
                        "created" : x.created,
                        "modified" : x.modified
                    });
                });
                res.json(arr);
            });     

        }
    });

    app.get('*', function(req, res) {
        res.sendfile('./public/index.html');
    });
};
