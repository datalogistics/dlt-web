/* Configuration file - Configure all source info here .. remove all URL related info from other files */
var fs = require('fs'),
_ = require('underscore');
var unis_cert = './dlt-client.pem';
var unis_key  = './dlt-client.pem';
//var key  = fs.readFileSync(unis_key);
//var cert = fs.readFileSync(unis_cert);

var self = {    
  jnlpMap : {
    'download': {
      'template': './misc/dlt-client.jnlp.tmpl',
      'codebase': 'http://dlt.incntre.iu.edu/webstart',
      'jarfile' : 'lib/dlt-client.jar'
    },
    'publish' : {
      'template': './misc/dlt-publisher.jnlp.tmpl',
      'codebase': 'http://dlt.incntre.iu.edu/webstart',
      'jarfile' : 'lib/dlt-publisher.jar'
    }
  },
  routeMap : { 
    // Aggregate from the following by default 
    'default'  : ['dlt', 'monitor'],
    // Empty array is ignored and goes to default , otherwise using this to aggregate        
    'measurements' : [],
    'exnodes' : ['dev'],
    'nodes': [] ,        
    'nodes_id' : [],
    'services': [] ,
    'services_id' : [],
    'measurements': [],
    'measurements_id' : [],
    'metadata': [],
    'metadata_id' : [],
    'data': ['dlt_ms', 'monitor_ms'],
    'data_id': ['dlt_ms', 'monitor_ms'],
    'ports': [],
    'ports_id' : []
  },
  serviceMap : {   
    dev : {
      url : "dev.incntre.iu.edu" ,
      port : "8888",
      key: null,
      cert: null,
      use_ssl: false
    },
    dlt : {
      url : "dlt.incntre.iu.edu",
      port : "9000",
      key: "./dlt-client.pem",
      cert: "./dlt-client.pem",
      use_ssl: true
    },
    monitor : {
      url : "monitor.incntre.iu.edu",
      port : "9000",
      key: null,
      cert: null,
      use_ssl: false
    },
    dlt_ms : {
      url : "dlt.incntre.iu.edu",
      port : "9001",
      key: "./dlt-client.pem",
      cert: "./dlt-client.pem",
      use_ssl: true
    },
    monitor_ms : {
      url : "monitor.incntre.iu.edu",
      port : "9001",
      key: null,
      cert: null,
      use_ssl: false
    }
  },
  sslOptions : {
    requestCert: true,
    rejectUnauthorized: false
  },
  usgs_row_searchurl : "http://landsat.usgs.gov/includes/scripts/get_metadata.php",
  usgs_lat_searchurl : "http://earthexplorer.usgs.gov/EE/InventoryStream/latlong",
  getSocketOptions : function () {
    
  },
  getHttpOptions : function (cfg) {
    var rmap = self.routeMap;
    var smap = self.serviceMap;
    // Using the name - make it get the http options        
    cfg = cfg || {};
    var pr = rmap[cfg.name];
    var hostList = !_.isEmpty(pr) ? pr : rmap.default;
    // The options array to be sent
    var hostArr = [], portArr = [], keyArr = [], certArr = [], doSSLArr = [];
    // Create options according to hosts 
    hostList.map(function(x){
      hostArr.push(smap[x].url);
      portArr.push(smap[x].port);
      keyArr.push(smap[x].key);
      certArr.push(smap[x].cert);
      doSSLArr.push(smap[x].use_ssl);
    });    
    var httpOptions = {
      hostArr: hostArr,
      portArr: portArr,
      method: 'GET',
      keyArr : keyArr ,
      certArr : certArr,
      doSSLArr : doSSLArr,
      headers: {
        'Content-type': 'application/perfsonar+json',
        'connection': 'keep-alive'
      }
    };
    return httpOptions;
  }
};

module.exports = self;
