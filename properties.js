/* Configuration file - Configure all source info here .. remove all URL related info from other files */
var fs = require('fs'),
_ = require('underscore');

var self = {
  port : process.env.PORT || 42424,
  ENABLE_HTTPS : false,
  // Defaulting to self-signed certs
  ssl : {
    key : './ssl/server.key',
    cert : './ssl/server.crt',
    ca :  './ssl/ca.crt'
  },
  sslOpt : {
    // Example of domain
    'dlt.open.sice.indiana.edu' : {
      key : './ssl/server.key',
      cert : './ssl/server.crt',
      ca : "./ssl/incommon_inter.cer"
    }
  },
  nat_map_file : './misc/idms_nat_map',
  freegeoipUrl : "http://api.ipstack.com",
  freegeoKey   :  "?access_key=ce853dd619e7655fab8cc7a173697d51",
  jnlpMap : {
    'download': {
      'template': './misc/dlt-client.jnlp.tmpl',
      'codebase': 'http://dlt.open.sice.indiana.edu/webstart',
      'jarfile' : 'lib/dlt-client.jar'
    },
    'publish' : {
      'template': './misc/dlt-publisher.jnlp.tmpl',
      'codebase': 'http://dlt.open.sice.indiana.edu/webstart',
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
  idms_server : "",
  routeMap : {
    // Aggregate from the following by default
    //'default'  : ['dev', 'dlt', 'monitor'],
    'default': ['iu'],
    // Empty array is ignored and goes to default , otherwise using this to aggregate
    'measurements' : [],
    'exnodes' : ['exnodedev',],
    'idms_url' : [],
    'nodes': [],
    'nodes_id' : [],
    //'services': ['dev', 'dlt', 'monitor', 'msu', 'um', 'wsu'] ,
    'services': [],
    //'services_id' : ['dev', 'dlt', 'monitor', 'msu', 'um', 'wsu'],
    'services_id': [],
    'measurements': [],
    'measurements_id' : [],
    'metadata': [],
    'metadata_id' : [],
    'data': ['dlt_ms',],
    'data_id': ['dlt_ms',],
    'ports': [],
    'ports_id' : [],
    'wildfire' : []
  },
  // Add a callback to process data for various routes
  routeCb : {
    // All functions are present in routeCb.js
    'services' : "",
    'services_id' : ""
  },
  filterMap : {
    //services : "serviceType=ibp_server",
    services : "",
    exnodes : ""
  },
  wsfilterMap : {
    //services : '{"serviceType":{"in":["ibp_server"]}}'
    services : ""
  },
  serviceMap : {
    local : {
      url : "localhost",
      port : "8888",
      use_ssl : false
    },
    slate : {
      url : "155.101.6.236",
      port : "8888",
      use_ssl : false
    },
    idms_url_000 : {
      url: "TBA",
      port: "TBA",
      use_ssl: false
    },
    exnodedev : {
      url: "unis.open.sice.indiana.edu",
      port: "8890",
      use_ssl: false
    },
    iu: {
      url: "iu-ps01.osris.org",
      port: "8888",
      use_ssl: false
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
      url : "unis.open.sice.indiana.edu",
      port : "8888",
      use_ssl : false,
    },
    dlt : {
      url : "dlt.open.sice.indiana.edu",
      port : "9000",
      key : "./ssl/dlt-client.pem",
      cert: "./ssl/dlt-client.pem",
      use_ssl: true
    },
    dlt_ms : {
      url : "dlt.open.sice.indiana.edu",
      port : "9001",
      key : "./ssl/dlt-client.pem",
      cert : "./ssl/dlt-client.pem",
      use_ssl : true
    }
  },
  sslOptions : {
    requestCert: true,
    rejectUnauthorized: false
  },
  usgs_row_searchurl : "http://earthexplorer.usgs.gov/EE/InventoryStream/pathrow",
  usgs_lat_searchurl : "http://earthexplorer.usgs.gov/EE/InventoryStream/latlong",
  wildfire_policies_url : "http://dlt.open.sice.indiana.edu:8000",
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
  GITHUB_SECRET: "",
  SCHEMAS: {
  'networkresources': 'http://unis.open.sice.indiana.edu/schema/20160630/networkresource#',
  'nodes': 'http://unis.open.sice.indiana.edu/schema/20160630/node#',
  'domains': 'http://unis.open.sice.indiana.edu/schema/20160630/domain#',
  'ports': 'http://unis.open.sice.indiana.edu/schema/20160630/port#',
  'links': 'http://unis.open.sice.indiana.edu/schema/20160630/link#',
  'paths': 'http://unis.open.sice.indiana.edu/schema/20160630/path#',
  'networks': 'http://unis.open.sice.indiana.edu/schema/20160630/network#',
  'topologies': 'http://unis.open.sice.indiana.edu/schema/20160630/topology#',
  'services': 'http://unis.open.sice.indiana.edu/schema/20160630/service#',
  'blipp': 'http://unis.open.sice.indiana.edu/schema/20160630/blipp#',
  'metadata': 'http://unis.open.sice.indiana.edu/schema/20160630/metadata#',
  'datum': 'http://unis.open.sice.indiana.edu/schema/20160630/datum#',
  'data': 'http://unis.open.sice.indiana.edu/schema/20160630/data#',
  'measurement': 'http://unis.open.sice.indiana.edu/schema/20160630/measurement#'
  }
};

self.recurse_map = {
  [self.SCHEMAS.topologies]: ["domains", "networks", "paths", "nodes", "ports", "links"],
  [self.SCHEMAS.domains]: ["domains", "networks", "paths", "nodes", "ports", "links"],
  [self.SCHEMAS.networks]: ["nodes", "links"],
  [self.SCHEMAS.nodes]: ["ports"]
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
