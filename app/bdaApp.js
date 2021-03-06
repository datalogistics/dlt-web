'use strict';
var fs = require('fs') 
, path = require('path')
, tls = require('tls')
, q = require('q')
, _ = require ('underscore')
, repeatedPromises = require('./repeatedPromises')
, usgsapi = require('./usgsapi');

function Encryption() {
  this._defaultEncryptionKey = "JNFjkf785jkfJR34";
  this._saltValue = "sd554As5A";
  this._scramble1 = "! #$%&()*,-.+/0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~";
  this._scramble2 = "f^jAE]okIOzU[2&q1{3`h5w_794p@6s8?BgP>dFV=m D<TcS%Ze|r:lGK/uCy.Jx)HiQ!#$~(;Lt-R}Ma,Nv+WYnb*0X";
  this._adj = 1.75;
  this._mod = 3;
  this._encrypt = function(key , source,sourcelen) {
    if (_.isEmpty(source)) {
      throw new Error("EncryptError");
    } else {
      var fudgeFactor = this._convertKey(key);
      var target = "";
      var factor2 = 0.0;      
      for (var i = 0; i < source.length; i++) {
        var c1 = source.charAt(i);        
        var num1 = _.indexOf(this._scramble1,c1);
        if (num1 == -1.0) {
          throw new Error("Source string contains an invalid character");
        } else {
          var adj = this._applyFudge(fudgeFactor);
          var factor1 = factor2 + adj;
          var num2 = Math.round(factor1) + num1;
          num2 = this._checkRange(num2);
          factor2 = factor1 + num2;
          //console.log(num2);
          target = target + this._scramble2.charAt(num2);
        }
      }  
      return target;
    }    
  };

  this._decrypt = function(key, source) {
    if (_.isEmpty(source)) {
      throw new Error("DecryptError - No Value supplied");
    } else {
      var fudgeFactor = this._convertKey(key);
      var target = "";
      var factor2 = 0.0;      
      for (var i = 0; i < source.length; i++) {
        var c2 = source.charAt(i);        
        var num2 = _.indexOf(this._scramble2,c2);
        if (num2 == -1.0) {
          throw new Error("Source string contains an invalid character");
        } else {
          var adj = this._applyFudge(fudgeFactor);
          var factor1 = factor2 + adj;
          var num1 = num2 - Math.round(factor1);
          num1 = this._checkRange(num1);
          factor2 = factor1 + num2;          
          target = target + this._scramble1.charAt(num1);
        }
      }
      return target;
    }
  };
  
  this._checkRange = function(rawNum) {
    var num = Math.round(rawNum);    
    var limit = this._scramble1.length;
    while (num >= limit) {
      num -= limit;
    }    
    while (num < 0.0) {
      num += limit;
    }    
    return num;
  };

  this._applyFudge = function(fudgeFactor) {    
    var fudge = fudgeFactor[0];
    fudge += this._adj;    
    for (var i = 1; i < fudgeFactor.length; i++) {
      fudgeFactor[(i - 1)] = fudgeFactor[i];
    }    
    fudgeFactor[(fudgeFactor.length - 1)] = fudge;
    if (this._mod != 0)
    {

      if (fudge % this._mod < 1)
      {
        fudge = fudge * -1;
      }
    }    
    return fudge;
  };

  this._convertKey = function(key) {
    if (_.isEmpty(key)) {
      throw new Error("No value has been supplied for the encryption");      
    } else {
      var array = [];
      array.push(key.length * 1.0);
      var tot = 0.0;
      for (var i = 0; i < key.length; i++) {
        var c = key.charAt(i);
        var num = _.indexOf(this._scramble1,c); 
        if (num == -1) {
          throw new Error("Key contains an invalid character (" + c + ")");
        } 
        tot += num;
        array.push(num * 1.0);
      } 
      array.push(tot); 
      var returnArray = new Array(array.length);
      for (var i = 0; i < array.length; i++) {
        returnArray[i] = array[i];
      }
      return returnArray;
    }    
  };
  this.encrypt = function(source) {
    if (source) {
      var part1 = source.substring(0, source.length / 2);
      var part2 = source.substring(source.length / 2);
      var saltedSource = part1 + this._saltValue + part2;      
      return this._encrypt(this._defaultEncryptionKey, saltedSource, 0);
    } else
      return "";
  };
  this.decrypt = function(source) {
    if (source) {
      var decoded = this._decrypt(this._defaultEncryptionKey,source);
      return decoded.replace(new RegExp(this._saltValue,"g"),"");
    } else
      return "";
  };
};


var encrypt = new Encryption();
var bdaRequest = {
  getLoginJson : function (username, password,isEncrypted) {
    return {"message":"","requester":"bda",
            "requestType":2,
            "username":isEncrypted ? username : encrypt.encrypt(username),
            "password":isEncrypted ? password : encrypt.encrypt(password),
            "clientDetails":{"os":"Windows 8.1 (build 6.3, amd64)","javaVersion":"1.7.0_75"},
            "version":"1.5.3"};
  },
  getOrdersJson : function () {
    return {"message":"","requester":"bda","requestType":7};
  },
  getOrderDetailsJson : function (orderId) {
    return {"message":"","requester":"bda","requestType":3,"orderId":orderId};
  },
  getDeleteOrderJson: function(orderId) {
    return {"message":"","requester":"bda","requestType":8,"orderId":orderId};
  },
  getKeepAliveJson : function() {
    return {"message":"","requester":"bda","requestType":1};
  }
};

var bdaSocket = function () {
  var self = this;
  var sock;
  var isConnected = false;
  var isLoggedIn = false;
  // Request to promise map
  var reqMap = {};
  var errorHandler = function(err) {
    console.log("ErrHandler ");
    sock.close();
    return err;
  };
  var doConnect = function () {
    var prom = q.defer();
    if (!isConnected) {
      sock = tls.connect(4448,"eebulk.cr.usgs.gov",{
        rejectUnauthorized : false,
        ciphers : "ADH-RC4-MD5",
        // secureProtocol : "SSLv23_method",
        // secureOptions : "SSL_OP_NO_SSLv2",
        handshakeTimeout : 3000
      });    
      self.sock = sock;
      
      sock.once("connect",function() {
        isConnected = true; isLoggedIn = false;
        // console.log("Session id ",sock.getSession());
        prom.resolve(sock);
      });
      
      sock.on('error',function(err){
        isConnected = false; isLoggedIn = false;
        sock.destroy();
        prom.reject(err);
        // console.log("BDA Sock Error " , arguments);
      });
      
      sock.once('close',function(){  
        isConnected = false; isLoggedIn = false;
        sock.destroy();
        // console.log("Closed",arguments);
      });
      
      var tmp = "";
      sock.on('data',function(data) {
        var dStr = data.toString();
        tmp += dStr;
        // Message from server finishes with \n
        if (dStr.indexOf("\n") != -1) {
          var json = JSON.parse(tmp);
          var prom = reqMap[json.requestType];
          if (prom) {
            prom.resolve(json);
          }
          tmp = "";
        }
      });
    } else {
      prom.resolve(self.sock);
    }
    return prom.promise;
  };


  var doReq = function (json) {
    if (!json.requestType)
      throw new Error("No requestType set ");
    // Store a promise for the requestType in map and if it already exists then wait for it to resolve or reject    
    return doConnect().then(function (sock) {
      var prom = reqMap[json.requestType];
      function cb() {
        prom = q.defer();
        sock.write(JSON.stringify(json) + "\r\n",'utf-8');
        reqMap[json.requestType] = prom;
        return prom.promise;
      };
      if (prom) {
        return prom.promise.then(cb);
      } else {
        return cb();
      }                 
    });
  };  
  
  
  
  this.sock = sock;

  var doLogin = this.login = function (uname,pwd,isEncrypted) {
    var prom = q.defer();
    if (isLoggedIn) {
      prom.resolve();
    } else if (!uname || !pwd) {
      prom.reject("No Username or password");
    } else {      
      var json = bdaRequest.getLoginJson(uname,pwd,isEncrypted);
      doReq(json).then(function (res) {
        if (res.errorCode == 0) {
          isLoggedIn = true;
          prom.resolve();
        } else {
          prom.reject(res.message);
        }
      },function(err) {
        prom.reject(err);
      });
    };
    return prom.promise;
  };

  this.getOrders = function() {
    var json = bdaRequest.getOrdersJson();
    var prom = q.defer();
    doLogin().then(function() {
      return doReq(json);
    }).then(function(res) {
      if (res.errorCode == 0) {
        prom.resolve(res);
      } else {
        prom.reject(res);
      }
    }).fail(function(res) {
      prom.reject(res);
    });
    return prom.promise;
  };
  this.close = function() {
    this.sock.destroy();
  };
  this.deleteOrderGroup = function(orderId) {
    var json = bdaRequest.getDeleteOrderJson(orderId);
    var prom = q.defer();
    doLogin().then(function() {
      return doReq(json);
    }).then(function(res) {
      if (res.errorCode == 0) {
        prom.resolve(res);
      } else {
        prom.reject(res);
      }
    }).fail(function(res) {
      prom.reject(res);
    });
    
    return prom.promise;
  };  
  this.getEnityIds = function (orderId) {
    var json = bdaRequest.getOrderDetailsJson(orderId);
    var prom = q.defer();
    doLogin().then(function() {
      return doReq(json);
    }).then(function(res) {
      if (res.errorCode == 0) {
        prom.resolve(res);
      } else {
        prom.reject(res);
      }
    }).fail(function(res) {
      prom.reject(res);
    });
    return prom.promise;
  };  
};

// soc.login("indianadlt","indiana2014").then(function() {
//   return soc.getOrders();
// }).then(function(res) {
//   console.log("Response ", res);
// });

var prQ = repeatedPromises.getPromiseQueue(30);
// Lets just start the promise queue
prQ.run();

var bdaApi = {
  Encryption : Encryption,
  _smap : {},
  deleteOrderGroup : function(username,password,isEncrypted,orderId) {
    var soc = new bdaSocket();
    return soc.login(username,password,isEncrypted)
      .then(soc.deleteOrderGroup.bind(this,orderId));
  },
  _getAllOrders : function (username, password,isEncrypted) {
    var soc = new bdaSocket();
    var orderList;
    return soc.login(username,password,isEncrypted)
      .then(soc.getOrders)
      .then(function(res) {
        return res.orders.map(function(x) {return x.orderId;});
      })
      .then(function(orders) {
        var promArr = [];
        orderList = orders;
        orders.forEach(function(x) {
          promArr.push(soc.getEnityIds(x));
        });
        return q.allSettled(promArr);
      })
      .then(function (valArr) {
        // Add orderId to all file info
        valArr.map(function(x,ind) {
          x.value.filelist.map(function(x) {
            x.orderId = orderList[ind];
          });
        });
        var arr = valArr.filter(function(x) {
          return x.state == 'fulfilled';
        });
        arr = arr.map(function(x) { return x.value.filelist;});      
        var entity_list = arr.reduce(function(x,y) {
          x.push.apply(x,y);
          return x;
        },[]);
        soc.close();
        return entity_list;
      });
  },
  getAllOrders : function(username,password,isEncrypted) {
    var d = q.defer();
    var queFun = (function() {
      return function() {
        var prom = bdaApi._getAllOrders(username,password,isEncrypted);
        prom.then(function(x) {
          d.resolve(x);
        });
        prom.fail(function(x) {
          d.reject(x);
        });
        return prom;
      };
    })();
    prQ.addToQueue(queFun);
    return d.promise;
  }
};


// bdaApi.getAllOrders("prblackwell","g00d4USGS").then(function(x) { console.log(x);}).catch(function(x) {
//   console.log(x,arguments);
// });
// bdaApi.getAllOrders("prakraja","prak8673").then(function(x) { console.log(x);}).catch(function(x) {
//   console.log(x,arguments);
// });
// bdaApi.deleteOrderGroup("prakraja","prak8673",false,507585)
//   .then(function(x) {
//     console.log(x);
//   })
// prQ.run();
// for (var i = 0; i < 1000 ; i++) {  
//   var prom = bdaApi.getAllOrders("indianadlt","indiana2014");
//   prom.then(function(x) {
//     console.log(i, " : ",x);
//   }).catch(function(x) {
//     console.log("Err ",x);
//   });

//   // })(i);
//   // prQ.addToQueue(queFun);
// }

module.exports = bdaApi;
