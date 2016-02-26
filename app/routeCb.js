var _ = require('underscore');
var q = require('q');
var cfg = require('../properties');
var request = require('request');
var promCache = {};
var zipcodes = require('zipcodes');
function updateLocation(obj,res) {
  var loc = obj.location = obj.location || {};
  loc.latitude = loc.latitude || res.latitude;
  loc.longitude = loc.longitude || res.longitude;
  loc.city = loc.city || res.city;
  loc.state = loc.state || res.state;
}
function getLocation(ap,obj) {
  // Just don't get location if it exists 
  if (obj && obj.location) {
    var lc = obj.location;
    if (lc.city && lc.state && lc.latitude && lc.longitude)
      return q.resolve();
  }
  
  var url = cfg.freegeoipUrl + "/json/";
  var name;
  try {
    name = obj.accessPoint.split(':')[1].replace('//', '');
  } catch(e) {
    // Ignore
    return q.thenResolve();
  }
  if (name && promCache[name]) {
    return promCache[name].then(function(res) {
      if (!res.error)
        updateLocation(obj,res);
    });
  }
  // Try to getfrom Zipcode first
  if (obj && obj.location && Number(obj.location.zipcode)) {    
    var loc = zipcodes.lookup(Number(obj.location.zipcode));
    if (loc) {
      promCache[name] = q.resolve(loc);
      updateLocation(obj,loc);
      return q.resolve(loc);
    } else {
      console.log("Unknown zip Location is " , loc , " for Zipcode " , obj.location.zipcode);
    }
  }  
  // Get it from IP service
  var prom = q.defer();
  name = unescape((name||"").trim());
  request(url + name, function (err, r, resp) {
    try{ 
      if (err)
	prom.resolve({error:true});
      else {
	var res = JSON.parse(resp);
	res.state = res.region_code; // Normalize state
	updateLocation(obj,res);
	prom.resolve(res);
      }
    } catch(e) {
      console.log(e,resp);
      prom.resolve({error:true});
    }
  });
  promCache[name] = prom.promise;
  return prom.promise;

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
