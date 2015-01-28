/* Configuration file - Configure all source info here .. remove all URL related info from other files */
var fs = require('fs');
var unis_cert = './dlt-client.pem';
var unis_key  = './dlt-client.pem';
var  key  = fs.readFileSync(unis_key),
     cert = fs.readFileSync(unis_cert);

var self = {
    ms : {
        // Default is defined at bottom
        dev : {
            url : "dev.incntre.iu.edu" ,
            port : "8888"
        },
        dlt : {
           url : "dlt.incntre.iu.edu",
           port : "9001"
        },
        monitor : {
           url : "monitor.incntre.iu.edu",
           port : "9001"
        }
    }, 
    unis : {   
        // Default is defined at bottom
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
    getHttpOptions : function (cfg) {
        var unis = self.unis,
            ms = self.ms,
            keys = self.keyCertMap;
        cfg = cfg || {};
        // Default is Unis dev
        // Depending to no. of options se
        var hostList = ['dev'] ;
        var hostArr = [] , portArr = [] , keyArr = [] , certArr = [], isHttpsArr = [];
        // Create options according to hosts 
        hostList.map(function(x){
            var url , port , key , cert;
            var isHttps = false;                
            if (!cfg.isMs){
                switch (x) { 
                case 'dev' : 
                    url = unis.dev.url ; port = unis.dev.port;
                    key = keys['dev'].key;cert = keys['dev'].key;                    
                    break;
                    // Add more 
                };
            } else {
                switch (x) {
                case 'dev' : 
                    url = ms.dev.url ; port = ms.dev.port;
                    key = keys['dev'].key;cert = keys['dev'].key;                                        
                    break;
                    // Add more 
                };
            }    
            hostArr.push(unis.dev.url); portArr.push(unis.dev.port);
            keyArr.push(keys['dev'].key);certArr.push(keys['dev'].key);
            isHttpsArr.push(isHttps);
        });    
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
self.unis.default = self.unis.dev;
self.ms.default = self.ms.dev;
module.exports = self;
