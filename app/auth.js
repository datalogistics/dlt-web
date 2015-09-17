/**
 * Holds all authorization and authentication related code
 */
var url = require('url')
, cfg = require('../properties')
, util = require('util')
, _ = require('underscore');
var q = require('q');
var bcrypt = require('bcrypt');
var forge = require('node-forge');
var conv = require('binstring');
var MongoClient = require('mongodb').MongoClient
, assert = require('assert');
var request = require('request');
var authHelper = require('./authHelper');
// Connection URL 
var dburl = cfg.db.url + "/" + cfg.db.name;
// Use connect method to connect to the Server
var cname = cfg.db.collection_name;
/**
 Create Hash from password usinng bcrypt
 */
function getHash(pwd) {
  return q.ninvoke(bcrypt,"genSalt",10)
    .then(function(salt) {      
      return q.ninvoke(bcrypt,"hash",pwd,salt);
    });
}

/**
 Check if password matches hash
 */
function checkPwd(hash,pwd) {
  return q.ninvoke(bcrypt,"compare",pwd, hash);
}

var EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i;
function validateReg(obj) {
  if (!(obj.name)) return false;
  if (!(EMAIL_REGEX.test(obj.email))) return false;
  if (!(obj.password && obj.password === obj.cpassword)) return false;
  return true;
}

function validateLogin(obj) {  
  if (!(EMAIL_REGEX.test(obj.email))) return false;
  if (!(obj.password)) return false;
  return true;
}

/**
 Stores user details in DB collection - Takes Collection and Object
 */
function registerLogin(C,obj) {
  if (validateReg(obj)) {
    obj._id = obj.email;
    delete obj.cpassword;
    return getHash(obj.password)
      .then(function(val) {
        obj.password = val;
        return q.ninvoke(C,"insert",[obj]);
      });
  } else {
    return q.reject(Error("Invalid Values"));
  }
};

/** 
 Update User details with user keys and ABAC certificates
 **/
function addKeysToAccount(C,_id,obj) {
  return q.ninvoke(C,"update",{"_id" : _id},{$set : obj});
};

/**
 Takes the email of the logged in user and gets details - Is a promise
 */
function getUserDetails() { 
}

/**
 Takes username/email and password - Then authenticates user
 Returns Promise - i.e if successful then accept else reject 
 */
function loginUser(C,obj) {
  if (validateLogin(obj)) {
    return q.ninvoke(C,"findOne",{_id : obj.email})
      .then(function(docs) {
        if (!docs || !docs.password)
          return q.reject(Error("email not present"));
        return q.all([docs,checkPwd(docs.password,obj.password)]);
      });
  } else {
    return q.reject(Error("Invalid input"));
  }
}

// MongoClient.connect(dburl, function(err, db) {
//   assert.equal(null, err);
//   console.log("Connected correctly to server");
//   var C = db.collection(cname);
  

//   // // C.insert([{id : "asd@ads.com",k:1}],function(err,resul) {
//   // //   console.log(err,resul);    
//   // // });
//   // registerLogin(C,{email : "as1d11@ads.com",password : "1" , name :"dasd", cpassword : "1"})
//   //   .then(function(res) {
//   //     console.log("Registered succ " ,res );
//   //     return loginUser(C,{email : "as1d11@ads.com" , password : "1" })
//   //   })
//   //   .then(function() {
//   //     console.log("Logged In ");
//   //   })
//   //   .catch(function(err) {
//   //     console.log("Login failed because of ", err);
//   //   })
//   //   .finally(function() {
//   //     db.close();
//   //   });
// });
var dbcollectionPromise = q.ninvoke(MongoClient,"connect",dburl)
      .then(function(db) {
        /** Lets do some Database cleanup here **/
        function exit() {
          console.log("Shutting down and closing connections to DB");
          db.close();
          process.exit();
        }
        process.on('exit',exit);
        process.on('SIGINT',exit);
        // process.on('uncaughtException',exit);
        return db.collection(cname);
      });
var AUTH_COOKIE_NAME = "userDetails";
var auth = {
  addRoutes : function(prefix,app) {        
    app.post(prefix + 'login' , function(req,res) {
      var email = req.body.email;
      var obj = {
        email : email,
        password : req.body.password
      };
      dbcollectionPromise.then(function(C) {
        return loginUser(C,obj);
      }).then(function(arr) {
        var doc = arr[0];
        var isPwdVerified = arr[1];
        var pubKey = doc.pubKey;        
        var certs = doc.attributeCert;
        var unisUrl = 'http://127.0.0.1:8888/login';
        var prom = q.defer();
        console.log("Request posted " ,unisUrl);
        try {
          request.post(unisUrl,{form : {"userCert" : certs[0],"userPublicKey" : pubKey}})
            .on('data',function(resp,body) {              
              prom.resolve(resp);
            })
            .on('error',function(err) {
              prom.reject(err);
            });
        } catch(e) {
          console.log(e);
        }        
        return prom.promise;
      }).then(function(doc) {
        res.cookie(AUTH_COOKIE_NAME,email,{
          // TODO make secure
          secure : false,
          signed : false
        });        
        res.json({
          success : true
        });
      }).catch(function(err) {
        res.json({
          success : false,
          message : "Login failed" // Any reason if you want to populate in future
        });
      });
    });
    
    app.post(prefix + 'register' , function(req,res) {
      var email = req.body.email;       
      var obj = {
        name : req.body.name,
        email : email,
        password : req.body.password,
        cpassword : req.body.cpassword
      };
      dbcollectionPromise.then(function(C) {
        return registerLogin(C,obj);
      }).then(function() {
        return authHelper.createUser(conv(email,{out:'hex'}));
      }).then(function(obj) {
        return dbcollectionPromise.then(function(C) {
          return addKeysToAccount(C,email,obj);
        });
      }).then(function() {
        res.json({
          success : true
        });
      }).catch(function(err) {
        console.log("Error " ,err);
        res.json({
          success : false,
          error : err
        });
      });
    });
    app.post(prefix+'logout',function (req,res) {
      res.cookie(AUTH_COOKIE_NAME,null, {
        secure: false,
        signed: true,
        maxAge : 0
      });
      req.session.destroy();
      res.json({
        success : true
      })
    });
  }
};
module.exports = auth;











// var pki = forge.pki;


// getHash("dasdasd").then(function(v){
//   return checkPwd(v,"dasdasd");
// }).done(function(v) {
//   console.log(v);
// });

var githubOAuth = require('github-oauth')({
  githubClient: cfg['GITHUB_CLIENT'],
  githubSecret: cfg['GITHUB_SECRET'],
  baseURL: 'http://localhost:42424',
  loginURI: '/ghLogin',
  callbackURI: '/ghCallback',
  scope: 'user' // optional, default scope is set to user 
});

// require('http').createServer(function(req, res) {
//   if (req.url.match(/login/)) return githubOAuth.login(req, res)
//   if (req.url.match(/callback/)) return githubOAuth.callback(req, res)
// }).listen(80)

// githubOAuth.on('error', function(err) {
//   console.error('there was a login error', err)
// })
// var pki = forge.pki;
// var keygen = require('x509-keygen').x509_keygen;

// function generateUserTokens() {
//   var prom = q.defer();
//   keygen({ subject: '/CN=subject', destroy: true }, function(err, results) {
//     if (err) return q.reject(err.message);
//     var cert = results.cert;
//     var key = results.key;
//     q.resolve({ cert: cert , key : key });
//   });
//   return prom.promise;
// }

// generateUserTokens().done(function(va) {
//   console.log(va);
// });

// githubOAuth.on('token', function(token, serverResponse) {
//   console.log('here is your shiny new github oauth token', token)
//   serverResponse.end(JSON.stringify(token))
// })
