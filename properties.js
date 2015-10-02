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
  // Try to login and maintain cookie for the following UNIS instances
  authArr : [],
  routeMap : {
    // Aggregate from the following by default 
    'default'  : ['dlt', 'monitor'],
    // Empty array is ignored and goes to default , otherwise using this to aggregate
    'measurements' : [],
    'exnodes' : ['dev'],
    'nodes': [],
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
  // Add a callback to process data for various routes
  routeCb : {
    // All functions are present in routeCb.js
    'services' : "addLocation",
    'services_id' : "addLocation"
  },
  serviceMap : {
    local : {
      url : "localhost",
      port : "8888"
    },
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
