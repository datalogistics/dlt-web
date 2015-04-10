var path = require('path')
, fs = require('fs')
, readline = require('readline')
, http = require('http')
, https = require('https')
, url = require('url')
, cfg = require('../properties')
, util = require('util')
, _ = require('underscore')
, querystring = require('querystring')
, xmlparse = require('xml2js').parseString
, request = require('request')
, ejs = require('ejs')
, q = require('q');

var getOptions = cfg.getOptions;
var sslOptions = cfg.sslOptions;

var opt = getOptions({
  name : 'exnodes'
});

var paginateSize = 5;
// Send a cloned array and a func with promises
function paginateFunc(func,arr,otherArgs,isWait) {
  if (arr.length == 0)
    return [];
  var ls = arr.splice(0,paginateSize);
  var args = [];
  args.push(ls);
  args.push(otherArgs);
  var prom = func.apply(func,args);
  if (isWait) {
    prom.then(function(){
      paginateFunc(func,arr,otherArgs,isWait);
    });
    return prom;
  } else {    
    var promArr = paginateFunc(func,arr,otherArgs,isWait);
    promArr.push(prom);
    return promArr;
  }
};

function getIfPresent(idList) {
  var promArr = [];
  opt.map(function(x) {
    var tmp = paginateFunc(getIfExnodePresent,idList.slice(0),x);
    if (_.isArray(tmp)) {
      promArr.push.apply(promArr,tmp);
    } else {
      promArr.push(tmp);
    }
  });
  var idMap = {};
  idList.forEach(function(x) {
    // Reference counting - When value is equal to length of optArr , then send it
    idMap[x] = 0;
  });
  var optLength = opt.length;
  for(var i=0; i < promArr.length ; i++) {
    //console.log(promArr[i]);
    if (promArr[i].then) {
      promArr[i].then(function(res) {
        var rejArr = [];
        res.notpresent.forEach(function(x) {
          if (idMap[x] >= 0){
            idMap[x] += 1;
            if (idMap[x] >= optLength) {
              rejArr.push(x);
              // Remove it from IdMap
              delete idMap[x];
            }
          } else {
            // Already got the data for this
          }
        });
        console.log("Not Present " , rejArr);
        var presentArr = [];
        res.present.forEach(function(x) {
          idMap[nameToSceneId(x.name)] = -111; // Arbitrary num
          presentArr.push(x);
        });        
        console.log("Data " ,presentArr);
      });
    }     
  }
};


function nameToSceneId(name) {
  return name.split(/[_.]/)[0];
};

function getIfExnodePresent(idlist,hdetails) {
  //console.log("ID list " ,idlist , hdetails);
  var defer = q.defer();
  var str = idlist.join(",");
  var data = "";
  http.get({
    host : hdetails.url,
    port : hdetails.port,
    path : '/exnodes?fields=id,name&properties.metadata.scene_id='+str
  }, function(http_res) {
    http_res.on('data', function (chunk) {
      data += chunk;
    });
    http_res.on('end',function() {
      var obj = JSON.parse(data);
      if(!obj || !_.isArray(obj))
        defer.reject({id : idlist});
      
      var notpresent = idlist.slice(0);
      var sceneIdArr = obj.map(function(x) { return nameToSceneId(x.name || "") ;});
      notpresent = _.difference(notpresent,sceneIdArr);      
      defer.resolve({
        present : obj,
        notpresent : notpresent
      });
    });
    http_res.on('error',function(e) {
      console.log("Error for Id ",id);
      defer.reject({id : idlist});
    });
  });
  return defer.promise;
};

function getExnodeData(objlist) {
  var idlist = objlist.map(function(x) { return x.id});
  var str = idlist.join(","); 
  if (idlist.length > 0)
    http.get({
      host : cfg.serviceMap.dev.url,
      port : cfg.serviceMap.dev.port,
      path : '/exnodes?id='+str
    }, function(http_res) {
      var data = '';
      http_res.on('data', function (chunk) {
        data += chunk;  
      });
      http_res.on('end',function() { 
        var obj = JSON.parse(data);
        var retMap  = {};
        obj.map(function(x) {
          var arr = retMap[nameToSceneId(x.name)] = retMap[nameToSceneId(x.name)] || [];
          arr.push(x);
        });
        
        fullcb(retMap);
      });
      http_res.on('error',function(e) {
        console.log("Error for Id ",id);
      });
    });
}


getIfPresent(['LC80440322015096LGN00',2,2,3,4,4,6,7,8,83,2,3]);
function handleNotPresent(arr) {
}


function getExnodeData(sceneArr,precb , fullcb) {
  // split array into buckets of 5
  var Size = 5 ;
  // Clone the array 
  var arr = sceneArr.slice(0);   
  while (arr && arr.length > 0){
    var idlist = arr.splice(0,Size);
    var str = idlist.join(",");
    http.get({
      host : cfg.serviceMap.dev.url,
      port : cfg.serviceMap.dev.port,
      path : '/exnodes?fields=id,name&properties.metadata.scene_id='+str
    }, function(http_res) {
      var data = '';
      http_res.on('data', function (chunk) {
          data += chunk;
      });
      http_res.on('end',function() {
        var obj = JSON.parse(data);
        if(!obj || !_.isArray(obj))
          return;
        
        var notpresent = sceneArr.slice(0);
        var sceneIdArr = obj.map(function(x) { return nameToSceneId(x.name || "") ;});          
        notpresent = _.difference(notpresent,sceneIdArr);
        //console.log("NOt present sceneId " , sceneArr , notpresent , sceneIdArr);
        // Send precb with notpresent data
        // console.log("Not present ",notpresent , sceneIdArr);
        precb(notpresent);
        // Now send http reqeust to aggregate and return remaining data to fullcb
        var idlist = obj.map(function(x) { return x.id});
        var str = idlist.join(","); 
        if (idlist.length > 0)
          http.get({
            host : cfg.serviceMap.dev.url,
            port : cfg.serviceMap.dev.port,
            path : '/exnodes?id='+str
          }, function(http_res) {
            var data = '';
            http_res.on('data', function (chunk) {
              data += chunk;  
            });
            http_res.on('end',function() { 
              var obj = JSON.parse(data);
              var retMap  = {};
              obj.map(function(x) {
                var arr = retMap[nameToSceneId(x.name)] = retMap[nameToSceneId(x.name)] || [];
                arr.push(x);
              });
              
              fullcb(retMap);
            });
            http_res.on('error',function(e) {
              console.log("Error for Id ",id);
            });
          });
      });
      http_res.on('error',function(e) {
        console.log("Error for Id ",id);
      });
    });
  };
};
