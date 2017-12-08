/*
 * Rest Services for Exnode
 * public/js/map/
 * EsmondService.js
 */

function esmondService($http) {
  var service = {};
  var esmond_path = '/esmond/perfsonar/archive/';
  service.institutions = [];
  service.stats = [];

  service.grabPerfsonarUrls = function(cb){

    $http.get('/api/topologies').success(function(res) {

      // get first domain - the one that matters
      var domains = res[0].domains;
      domains.forEach(function(d){

        // massage out the stuff we dont need from the url
        var url = d.href.split(":");
        url.pop();
        url = url.join(":");
        console.log(url);
        jQuery.inArray(url, service.institutions) ? service.institutions.push(url) : console.log("Dupe");

      });

      return cb(service.institutions);
    });

    //.then(function(res){
    //  service.pointToSpread('http://um-ps01.osris.org', service.institutions, function(res){console.log(res)});
    //});
  };

  service.pointToPoint = function(src, dst, cb){
    $http.get(src + esmond_path + '?source=' + src.split('//')[1] + '&destination=' + dst.split('//')[1] + '&limit=1').success(function(res) {
        console.log(src + esmond_path);
        res == [] ? console.log("Nothing here...") : console.log(res);
        console.log("Response from ", src+esmond_path, res);
        return cb(res);
    }).error(function(res){
      console.log("COULDNT DO IT");
    });
  };

  service.pointToSpread = function(src, dsts, cb){
    for(var d in dsts){
      console.log("P2P src: ", src, " dst: ", dsts[d]);
      if(dsts[d] == src){
        continue;
      } else {
        service.pointToPoint(src, dsts[d], cb)
      }
    }
  };

  service.getAllStats = function(){

    service.institutions.forEach(function(inst){
      $http.get(inst + esmond_path + '?source=' + inst.split('//')[1] + '&limit=1').success(function(res) {
          console.log(inst + esmond_path);
          res == [] ? console.log("Nothing here...") : service.stats.pop({"institution" : inst, "stats" : res[0]});
          console.log("Response from ", inst+esmond_path, res);
      }).error(function(res){
        console.log("COULDNT DO IT");
      })
    });

    return service.stats;
  };

  return service;
}
