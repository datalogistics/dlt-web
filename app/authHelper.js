// =============================================================================
//  Data Logistics Toolkit (dlt-web)
//
//  Copyright (c) 2015-2016, Trustees of Indiana University,
//  All rights reserved.
//
//  This software may be modified and distributed under the terms of the BSD
//  license.  See the COPYING file for details.
//
//  This software was created at the Indiana University Center for Research in
//  Extreme Scale Technologies (CREST).
// =============================================================================
var cp = require("child_process");
var fs = require("fs");
var q = require('q');
var path = require('path');
var _ = require('underscore');
// var  "--attribute --issuer periscope_ID.pem --key periscope_private.pem --role read --subject-cert prakash_ID.pem --out Prakash_periscope_read.der"
// var  creddy --generate --cn "prakash"

var dir = "/opt/cred";
var mkdirp = require('mkdirp');
try {
  fs.accessSync("/opt/cred",fs.R_OK);  
} catch(e) {
  mkdirp(dir,function(err) {
    console.error("Unable to create Cred dir - check access rights to " , dir);
  });
}

var spawn = require('child_process').spawn;
var creddyComm = function(argString) {
  var arr = argString.split(" ");
  return spawn('creddy', arr);
};

function createCred(cn) {
  var prom = q.defer();
  var s = creddyComm("--generate --out "+dir+" --cn "+ cn);
  var errorStr = "";
  s.stdout.on('data',function(data) {
    errorStr+=data;
  });
  s.stderr.on('data',function(data) {
    errorStr+=data;
  });
  s.on('close',function(code) {
    // console.log('
    if (code == 0)
      prom.resolve(cn);
    else
      prom.reject(Error("Unable to generate - Exited with error "+errorStr));
  });
  return prom.promise;
}

function assignAttributes(cn,attr) {
  var prom = q.defer();
  
  var serverCert = path.join(dir,"periscope_ID.pem");
  var serverKey = path.join(dir,"periscope_private.pem");
  var subjectCert = path.join(dir,cn+"_ID.pem");
  var outFileName = path.join(dir,cn+"__periscope_"+role + ".der");
  var role = 'read';
  var s = creddyComm("--attribute --issuer "+ serverCert +" --key "+ serverKey + " --role "+ role + " --subject-cert "+subjectCert+" --out "+outFileName);
  var errorStr = "";
  s.stderr.on('data',function(code) {
    errorStr+=code;
  });
  s.on('close',function(code) {
    console.log("Code ",code);
    if(code === 0) {
      prom.resolve(outFileName);
    } else if (code === 1) {
      prom.reject(Error("Failed with Code "+code  + "\n" + errorStr));
    }
  });
  return prom.promise;  
}


function getAndDeleteAttrFile(fname) {
  return q.ninvoke(fs,"readFile",fname)
    .then(function(data) {
      // Delete the file
      fs.unlink(fname); 
      return {        
        attributeCert : [data.toString()]
      };
    });
}

function getAndDeleteCredFiles(cn) {  
  var privKey = path.join(dir,cn+"_private.pem");
  var pubKey = path.join(dir,cn+"_ID.pem");
  return q.all([q.ninvoke(fs,"readFile",privKey),q.ninvoke(fs,"readFile",pubKey)])
    .spread(function(priv, pub) {
      // Delete both the files
      fs.unlink(privKey);
      fs.unlink(pubKey); 
      return {        
        privKey : priv.toString(),
        pubKey : pub.toString()
      };
    });
}

function createUser(cn) {
  return createCred(cn).then(function(x) {
    return assignAttributes(cn,"read");
  }).then(function(fname) {
    return getAndDeleteAttrFile(fname);
  }).then(function(obj) {
    return getAndDeleteCredFiles(cn).then(function (obj1) {
      return _.extend(obj1,obj);
    });
  });
}
module.exports = {
  createUser : createUser,
  assignAttributes : assignAttributes,
  getAndDeleteCredFiles: getAndDeleteCredFiles,
  getAndDeleteAttrFile : getAndDeleteAttrFile
};
// ls.stdout.on('data', function (data) {
//   console.log('stdout: ' + data);
// });

// ls.stderr.on('data', function (data) {
//   console.log('stderr: ' + data);
// });

// ls.on('close', function (code) {
//   console.log('child process exited with code ' + code);
// });
