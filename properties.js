/* Configuration file - Configure all source info here .. remove all URL related info from other files */
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
    getHttpOptions : function (cfg) {
        var unis = self.unis,
            ms = self.ms;
        // Default is Unis dev
        var host = unis.dev.url , port = unis.dev.port;
        switch (cfg.name) {
            
        };
        var httpOptions = {
            hostname: host,
            port: port,    
            method: 'GET',
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
