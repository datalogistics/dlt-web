/* Configuration file - Configure all source info here .. remove all URL related info from other files */
var fs = require('fs'),
_ = require('underscore');
var unis_cert = './dlt-client.pem';
var unis_key  = './dlt-client.pem';
var  key  = fs.readFileSync(unis_key),
     cert = fs.readFileSync(unis_cert);

var self = {    
    // Just specify environment to use - it will automatically fill in url, port and authentication
    // No way to add any other config - Eg. https for one dev and not on other - alternative is to create 2 envs for dev : with http and https
    routeMap : { 
        // Aggregate from the following by default 
        'default'  : ['dev'],
        // Empty array is ignored and goes to default , otherwise using this to aggregate        
        'measurements' : ['dev'] ,
        'nodes': [] ,        
        'nodes_id' : [],
        'services': [] ,
        'services_id' : [],
        'measurements': [],
        'measurements_id' : [],
        'metadata': [],
        'metadata_id' : [],
        'data': ['monitorMs'],
        'data_id': ['monitorMs'],
        'ports': [],
        'ports_id' : []
    },
    unis : {   
        // This better match a name
        default : "dev",
        dev : {
            url : "dev.incntre.iu.edu" ,
            port : "8888"
        },
        dlt : {
           url : "dlt.incntre.iu.edu",
           port : "9000"
        },
        monitor : {
           url : "monitor.incntre.iu.edu",
           port : "9000"
        },
        dltMs : {
           url : "dlt.incntre.iu.edu",
           port : "9001"
        },
        monitorMs : {
           url : "monitor.incntre.iu.edu",
           port : "9001"
        }
    },
    keyCertMap : {
        "dev" : {
            key : key ,
            cert : cert
        }
    },
    prodOptions : {
      key: fs.readFileSync(unis_key),
      cert: fs.readFileSync(unis_cert),
      requestCert: true,
      rejectUnauthorized: false
    },    
    getSocketOptions : function () {
        
    },
    getHttpOptions : function (cfg) {
        var keys = self.keyCertMap;
        var rmap = self.routeMap;
        var unis = self.unis,
        // Using the name - make it get the http options        
        cfg = cfg || {};
        var pr = rmap[cfg.name] ;        
        var hostList = !_.isEmpty(pr) ? pr : rmap.default;
        // The options array to be sent
        var hostArr = [] , portArr = [] , keyArr = [] , certArr = [], isHttpsArr = [];
        // Create options according to hosts 
        console.log(hostList,rmap);
        hostList.map(function(x){
            var url , port , key , cert;
            var isHttps = false;                           
            hostArr.push(unis[x].url); portArr.push(unis[x].port);
            keyArr.push(keys[x].key);certArr.push(keys[x].key);
            isHttpsArr.push(isHttps);
        });    
        console.log(hostArr);
        var httpOptions = {
            hostname: hostArr,
            port: portArr,
            method: 'GET',
            keyArr : keyArr ,
            certArr : certArr,
            isHttpsArr : isHttpsArr,
            headers: {
                'Content-type': 'application/perfsonar+json',
                'connection': 'keep-alive'
            }
        };
        return httpOptions;
    }
};
self.unis.default = self.unis[self.unis.default];
module.exports = self;
