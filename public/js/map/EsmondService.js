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

  service.getThroughputTests = function(url, cb){

    var pruneName = function(arr, val){
      if(arr.length == 0){
        arr.push(val);
      } else {
        let found = false;
        arr.forEach(function(v){
          if(v.input_source == val.input_source && v.uri != val.uri){
            found = true;
          }
        });
        if(found == false){
          arr.push(val);
        }
      }
    };
    $http.get(url + esmond_path + '?event-type=throughput').success(function(res) {
        console.log(url + esmond_path);
        res == [] ? console.log("Nothing here...") : console.log(res);
        console.log("Response from ", url+esmond_path, res);
        var result = [];

        res.forEach(function(test){
          var res_obj = {};
          res_obj.input_source = test['input-source'];
          res_obj.input_destination = test['input-destination'];
          res_obj.source = test.source;
          res_obj.destination = test.destination;
          res_obj.uri = test.uri;
          pruneName(result, res_obj);
        });
        return cb(result);
    }).error(function(res){
      console.log("COULDNT DO IT");
    });
  };

  service.getTestByIP = function(url, ip, test, days, cb){
    var days = 86400 * days;
    $http.get(url + esmond_path + '?event-type=' + test + "&time-range=" + days).success(function(res) {
        console.log(url + esmond_path);
        res == [] ? console.log("Nothing here...") : console.log(res);
        console.log("Response from ", url+esmond_path, res);
        var result = [];

        res.forEach(function(test){
          var res_obj = {};
          res_obj.input_source = test['input-source'];
          res_obj.input_destination = test['input-destination'];

          if(res_obj.input_source == ip){
            result.push(test);
          }

        });
        console.log("RESULT FROM IP: ", ip, result);
        return cb(result);
    }).error(function(res){
      console.log("ERROR GETTING THROUGHPUT TEST");
    });
  };

  // ugh, I guess its not a reverse look up.
  service.reverseIPLookUp = function(host, url, cb){
    $http.get(host + esmond_path + '?source=' + url).success(function(res){
      console.log("URL: ", host + esmond_path + '?source=' + url);
      try{
        var ip = res[0].source;
        console.log("IP: ", ip);
        return cb(ip);
      }
      catch(err){
        return cb('error');
      }
    }).error(function(res){
      return cb('error');
    });
  };

  // returns the last day's worth of throughput tests for a given Interface

  service.getTestsOnInterface = function(url, cb){
    var be = url.split('.');

    var esmd = url + esmond_path + '?source=' + url.split('//')[1];
    console.log(esmd);
    var url_ip = '';

    service.reverseIPLookUp(url, url.split('//')[1], function(res){
      url_ip = res;

      // get throughput test
      res == undefined ? cb(res) : service.getTestByIP(url, url_ip, 'throughput', 1, function(res){
        if(res == 'error'){
          return cb([]);
        }
        result = {"throughput": res};
        res.result = "SUCCESS";

        service.getTestByIP(url, url_ip, 'packet-loss-rate', 1, function(res){
          console.log("PACKET LOSS RES: ", res);
          result.packet_loss = res;
          return cb(result);
        });
      });
    });
  };

  service.getThroughput = function(test_obj, cb){
    var url = test_obj.url + "throughput/base"
    $http.get(url).success(function(res){
      var latest_throughput = res[0].val;
      return cb(latest_throughput);
    });
  };

  service.getPacketLoss = function(test_obj, cb){
    var url = test_obj.url + "packet-lose-rate/base"
    $http.get(url).success(function(res){
      var latest_loss = res[0].val;
      return cb(latest_loss);
    }).error(function(res){
      return(cb("500 ERROR"));
    });
  };



  return service;
}