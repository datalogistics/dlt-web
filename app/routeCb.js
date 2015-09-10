var _ = require('underscore');
var q = require('q');
var cfg = require('../properties');
var request = require('request');
var locCache = {};
function updateLocation(obj,res) {
  var loc = obj.location = obj.location || {};
  loc.latitude = loc.latitude || res.latitude;
  loc.longitude = loc.longitude || res.longitude;
  loc.city = loc.city || res.city;
  loc.state = loc.state || res.region_code;
}
function getLocation(ap,obj) {  
  var url = cfg.freegeoipUrl + "/json/";
  var name = obj.accessPoint.split(':')[1].replace('//', '');  
  if (locCache[name]) {
    obj.k = 1;
    var res = locCache[name];
    updateLocation(obj,res);
    return q.thenResolve();
  } else {
    var prom = q.defer();
    request(url + name, function (err, r, resp) {
      var res = JSON.parse(resp);
      locCache[name] = res;
      updateLocation(obj,res);
      prom.resolve();
    });
    return prom.promise;
  }
};

function addLocation(obj) {
  console.log("Adding location");
  if (_.isArray(obj)) {
    var arr = [];    
    for (var i = 0 ; i < obj.length; i++) {
      arr.push(getLocation(obj[i].accessPoint, obj[i]));
    }
    return q.all(arr);
  } else if (typeof obj == "object") {    
    return getLocation(obj.accessPoint,obj);
  }
  return q.thenResolve();
}
module.exports = {
  addLocation : addLocation
};
