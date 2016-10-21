/* Configuration file - Configure all source info here .. remove all URL related info from other files */
var fs = require('fs'),
_ = require('underscore');
// var bunyan = require('bunyan');
var self = {
  port : process.env.PORT || 42424,
  ENABLE_HTTPS : false,
  // Defaulting to self-signed certs 
  ssl : {
    key : './cert/server.key',
    cert : './cert/server.crt',
    ca :  './cert/ca.crt'
  },
  sslOpt : {
    // Example of domain
    'dlt.incntre.iu.edu' : {
      key : './cert/server.key',
      cert : './cert/server.crt' 
      // ca : "./ssl/dlt-client.csr"
    }
  },  
  nat_map_file : './misc/idms_nat_map',
  freegeoipUrl : "http://dlt.incntre.iu.edu:8080",
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
  // shoppingCart_logger : (function() {    
  //   var log = bunyan.createLogger({
  //     name: "dlt-web cart",
  //     streams : [
  //       {
  //         path: "./logs/bun.log"
  //       }]
  //   });
  //   return log.info;
  // })(),
  // Match exnodes using name if true , else use properties.metadata.scene_id
  exnodeMatchingFromName : true,
  exnodeParent_UsingSelfRef : true,
  // Try to login and maintain cookie for the following UNIS instances
  authArr : [],
  routeMap : {
    // Aggregate from the following by default
    'default'  : ['dev', 'dlt', 'monitor'],
    // Empty array is ignored and goes to default , otherwise using this to aggregate
    'measurements' : [],
    'exnodes' : [],
    'nodes': [],
    'nodes_id' : [],
    'services': ['dev', 'dlt', 'monitor', 'msu', 'um', 'wsu'] ,
    'services_id' : ['dev', 'dlt', 'monitor', 'msu', 'um', 'wsu'],
    'measurements': [],
    'measurements_id' : [],
    'metadata': [],
    'metadata_id' : [],
    'data': ['dev', 'dlt_ms', 'monitor_ms'],
    'data_id': ['dev', 'dlt_ms', 'monitor_ms'],
    'ports': [],
    'ports_id' : []
  },
  // Add a callback to process data for various routes
  routeCb : {
    // All functions are present in routeCb.js
    'services' : "addLocation",
    'services_id' : "addLocation"
  },
  filterMap : {
    services : "serviceType=ceph,ceph-mon,ceph-osd,ibp_server",
    exnodes : "inline"
  },
  wsfilterMap : {
    services : '{"serviceType":{"in":["ceph","ceph-mon","ceph-osd","ibp_server"]}}'
  },
  serviceMap : {
    local : {
      url : "localhost",
      port : "8888",
      use_ssl : false
    },
    msu: {
	url : "msu-ps01.osris.org",
	port : "8888",
	use_ssl : false,
    },
    wsu: {
	url : "wsu-ps01.osris.org",
	port : "8888",
	use_ssl : false,
    },
    um: {
	url : "um-ps01.osris.org",
	port : "8888",
	use_ssl : false,
    },
    unis : {
      url : "unis.crest.iu.edu",
      port : "8888",
      use_ssl : false,
    },
    dev : {
      url : "dev.crest.iu.edu",
      port : "8888",
      key : null,
      cert : null,
      use_ssl : false
    },
    dlt : {
      url : "dlt.crest.iu.edu",
      port : "9000",
      key : "./dlt-client.pem",
      cert: "./dlt-client.pem",
      use_ssl: true
    },
    monitor : {
      url : "monitor.crest.iu.edu",
      port : "9000",
      key : null,
      cert : null,
      use_ssl : false
    },
    dlt_ms : {
      url : "dlt.crest.iu.edu",
      port : "9001",
      key : "./dlt-client.pem",
      cert : "./dlt-client.pem",
      use_ssl : true
    },
    monitor_ms : {
      url : "monitor.crest.iu.edu",
      port : "9001",
      key : null,
      cert : null,
      use_ssl : false
    }
  },
  sslOptions : {
    requestCert: true,
    rejectUnauthorized: false
  },
  usgs_row_searchurl : "http://earthexplorer.usgs.gov/EE/InventoryStream/pathrow",
  usgs_lat_searchurl : "http://earthexplorer.usgs.gov/EE/InventoryStream/latlong",
  usgs_api_credentials : {
    username : "indianadlt",
    password : "indiana2014"
  },
  db : {
    url : "mongodb://localhost:27017",
    name : "peri-auth",
    collection_name : "userDetails"
  },
  GITHUB_CLIENT: "",
  GITHUB_SECRET: ""
};

var deepObjectExtend = function(target, source) {
  for (var prop in source) {
    if (prop in target && typeof(target[prop]) == 'object' && typeof(source[prop]) == 'object')
      deepObjectExtend(target[prop], source[prop]);
    else
      target[prop] = source[prop];
  } 
  return target;
};

try {
  fs.accessSync("config.js",fs.R_OK);
  var config = require("./config");  
  self = deepObjectExtend(self,config);
} catch(e) {
  console.error("No config file exists - Create a config.js and do module.exports with JSON obj to override server properties",e);
}

module.exports = self;
