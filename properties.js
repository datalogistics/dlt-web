/* Configuration file - Configure all source info here .. remove all URL related info from other files */
var fs = require('fs'),
_ = require('underscore');

var self = {    
  nat_map_file : './misc/idms_nat_map',
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
  // Match exnodes using name if true , else use properties.metadata.scene_id
  exnodeMatchingFromName : true,
  routeMap : { 
    // Aggregate from the following by default 
    'default'  : ['dev'],
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
    'data': ['dev_ms'],
    'data_id': ['dev_ms'],
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
    dev_ms : {
      url : "dev.incntre.iu.edu",
      port : "8888",
      key: "./dlt-client.pem",
      cert: "./dlt-client.pem",
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
  usgs_api_credentials : {
    username : "indianadlt",
    password : "indiana2014"
  },
  // Correct way
  getOptions : function(cfg) {
    var rmap = self.routeMap;
    var smap = self.serviceMap;
    // Using the name - make it get the http options        
    cfg = cfg || {};
    var pr = rmap[cfg.name];
    var hostList = !_.isEmpty(pr) ? pr : rmap.default;
    return hostList.map(function(x) {
      return smap[x];
    });
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
