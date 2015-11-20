var _ = require('underscore');
var q = require('q');
var cfg = require('../properties');
var request = require('request');
var locCache = {};
var errorCache = {}; // The ignore list
var zipcodes = require('zipcodes');

function updateLocation(obj,res) {
  var loc = obj.location = obj.location || {};
  loc.latitude = loc.latitude || res.latitude;
  loc.longitude = loc.longitude || res.longitude;
  loc.city = loc.city || res.city;
  loc.state = loc.state || res.region_code;
}
function updateZLocation(obj,res) {
  var loc = obj.location = obj.location || {};
  loc.latitude = loc.latitude || res.latitude;
  loc.longitude = loc.longitude || res.longitude;
  loc.city = loc.city || res.city;
  loc.state = loc.state || res.state;
}

function getLocation(ap,obj) {  
  var url = cfg.freegeoipUrl + "/json/";
  if (obj.location && obj.location.city && obj.location.state && obj.location.latitude && obj.location.longitude && obj.location.zipcode) {
    // Do nothing - already has everything
    return q.thenResolve();
  } else if (obj.location && obj.location.zipcode) {
    // Use the zipcode to resolve
    var loc = zipcodes.lookup(obj.location.zipcode);
    if (loc.city) {      
      updateZLocation(obj,loc);
      return q.thenResolve();
    }
  } else {
    var name;
    try {
      name = obj.accessPoint.split(':')[1].replace('//', '');    
    } catch(e) {
      // Ignore 
      return q.thenResolve();
    }
    if (errorCache[name]) {
      // Ignore
      return q.thenResolve();
    } else if (locCache[name]) {      
      return locCache.then(function(res) {
	if (!res.error)
	  updateLocation(obj,res);
	return true;
      });
    } else {
      var prom = q.defer();
      request(url + name, function (err, r, resp) {
	try {
	  var res = JSON.parse(resp);
	  prom.resolve(res);
	}catch(e) {
	  console.log("Unable to resovle location ",name);
	  errorCache[name] = true;
	  prom.resolve({error:true});
	}
      });
      locCache[name] = prom.promise;
      return locCache[name].then(function(res) {
	console.log(res);
	if (!res.error)
	  updateLocation(obj,res);
	return true;
      });
    }
  }
  return q.thenResolve();
};

var LAST_TIME;
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
  var time = new Date().getTime();
  if (time - LAST_TIME > 600) {
    errorCache = [];
  }
  return q.thenResolve();
}
module.exports = {
  addLocation : addLocation
};
