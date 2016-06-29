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
var resourceHelper = require('./resourceHelper');
var getOptions = resourceHelper.getOptions;
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

function getIfPresent(idList, ifNotPresentcb , ifPresentCb) {
  var promArr = [];
  opt.map(function(x) {
    var tmp = paginateFunc(getExnodeData,idList.slice(0),x);
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
        ifNotPresentcb(rejArr);
        var presentArr = [];
        res.present.forEach(function(x) {
          idMap[nameToSceneId(x.name)] = -111; // Arbitrary num
          presentArr.push(x);
        });
        ifPresentCb(presentArr);
      });
    }
  }
};


function nameToSceneId(name) {
  return name.split(/[_.]/)[0];
};

function getExnodeData(idlist,hdetails) {
  //console.log("ID list " ,idlist , hdetails);
  var defer = q.defer();
  var fromName = cfg.exnodeMatchingFromName;
  var str;
  if (fromName) {   
    str = "("+ idlist.join(")|(") + ")";
  } else {
    str = idlist.join(",");
  }
  var data = "";
  var filter = "&fields=id,name,selfRef,metadata.scene,metadata.productCode";
  http.get({
    host : hdetails.url,
    port : hdetails.port,
    path : '/exnodes?'+ (fromName? "name=reg=" : "properties.metadata.scene_id=")+str+filter
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


// getIfPresent(['LC80440322015096LGN00','LC80440322015096LGN00',2,2,3,4,4,6,7,8,83,2,3]);

module.exports = {
  getExnodeDataIfPresent : getIfPresent,
  paginateFunc : paginateFunc,
  getExnodeData : getExnodeData,
  nameToSceneId : nameToSceneId
};
