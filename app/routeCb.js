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
  var name;
  try {
    name = obj.accessPoint.split(':')[1].replace('//', '');
    
  } catch(e) {
    // Ignore 
    return q.thenResolve();
  }
  if (locCache[name]) {
    obj.k = 1;
    var res = locCache[name];
    updateLocation(obj,res);
    return q.thenResolve();
  } else {
    var prom = q.defer();
    console.log(url+name);
    request(url + name, function (err, r, resp) {
      try {
	var res = JSON.parse(resp);
	locCache[name] = res;
	updateLocation(obj,res);
	prom.resolve();
      } catch(e) {
	prom.resolve();
      }
    });
    return prom.promise;
  }
};

function addLocation(obj) {
  try {
    if (_.isArray(obj)) {
      var arr = [];    
      for (var i = 0 ; i < obj.length; i++) {
        arr.push(getLocation(obj[i].accessPoint, obj[i]));
      }
      return q.all(arr);
    } else if (typeof obj == "object") {    
      return getLocation(obj.accessPoint,obj);
    }
  } catch(e) {
    console.error(e);
  }
  return q.thenResolve();
}
module.exports = {
  addLocation : addLocation
};
