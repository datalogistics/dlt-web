var cp = require("child_process");
var fs = require("fs");
var q = require('q');
var path = require('path');
var _ = require('underscore');
// var  "--attribute --issuer periscope_ID.pem --key periscope_private.pem --role read --subject-cert prakash_ID.pem --out Prakash_periscope_read.der"
// var  creddy --generate --cn "prakash"


var spawn = require('child_process').spawn;
var getVersionCmd = function(host,port) {  
  var arr = [host,port];
  return spawn('get_version', arr);
};

function parseOutput(data) {
  var lines = data.split(/\n/g);
  var obj = {};
  //obj.lines = lines;
  var regArr= [/^Depot Transfer Stats/i,
	       /^RID:/i,
	       /^Depot start time/i,
	       /^Total resources/i,
	       /^Depot start time/i,
               /^Uptime\(d:h:m:s\)/i,
	      ];
  var usefulLines = [];
  lines.forEach(function(x) {
    regArr.forEach(function(r,ind) {
      if (r.test(x)) {
	usefulLines[ind] = x;
      }
    });
  });
  usefulLines.forEach(function(v,ind) {
    switch(ind) {
    case 0:{
      var arr = v.match(/\(.*?\)/g);
      arr = arr.map(function(x) {
	return x.substr(1).slice(0,-1);
      });
      obj.depotTransferStats = {
	read : arr[0],write : arr[1], total : arr[2]
      };
    }break;
    case 1: {
      var arr = v.match(/\(.*?\)/g);
      arr = arr.map(function(x) {
	return x.substr(1).slice(0,-1);
      });
      obj.rid = {
	max : arr[0] , used : arr[1],diff : arr[2] , free : arr[3]
      };      
    }break;
    case 2: {
      var moment = require('moment');
      var val = v.match(/:.*/g)[0].substr(2);
      var date = moment(val,"ddd MMM D hh:mm:ss yyy");
      obj.depotStart = date;
    }break;
    };
  });
  obj.usefulLines = usefulLines;
  return obj;
}
function getVersion(host,prt) {
  var prom = q.defer();
  var port = Number(prt);
  if (Number.isNaN(port))
    prom.reject(Error("Invalid port"));  
  var s = getVersionCmd(host,port);
  var data = "";
  var errorStr = "";
  s.stdout.on('data',function(dt) {
    data += dt;
  });
  s.stderr.on('data',function(data) {
    errorStr+=data;
  });
  s.on('close',function(code) {
    // console.log('
    if (code == 0)
      prom.resolve(parseOutput(data));
    else
      prom.reject(Error("Unable to generate - Exited with error "+errorStr));
  });
  return prom.promise;
}


getVersion('128.206.119.19',6714).then(function() {
  console.log(arguments);
}).catch(function() {
  console.log(arguments);
});
