var _ = require('underscore');
var config = require('../properties');
module.exports = {
  // Correct way
  getOptions : function(cfg) {
    var rmap = config.routeMap;
    var smap = config.serviceMap;
    // Using the name - make it get the http options        
    cfg = cfg || {};
    var pr = rmap[cfg.name];
    var hostList = !_.isEmpty(pr) ? pr : rmap.default;
    return hostList.map(function(x) {
      return smap[x];
    });
  },
  getHttpOptions : function (cfg) {
    var rmap = config.routeMap;
    var smap = config.serviceMap;
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
}
