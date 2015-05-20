var fs = require('fs')
, path = require('path')
, tls = require('tls')
, _ = require ('underscore')
  // , certFile = path.resolve(__dirname, 'ssl/client.crt')
  // , keyFile = path.resolve(__dirname, 'ssl/client.key')
, request = require('request');

var ciphers = tls.getCiphers();
//console.log(ciphers);


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
    var part1 = source.substring(0, source.length / 2);
    var part2 = source.substring(source.length / 2);
    var saltedSource = part1 + this._saltValue + part2;      
    return this._encrypt(this._defaultEncryptionKey, saltedSource, 0);
  };
};

var encrypt = new Encryption();
//console.log(encrypt.encrypt("indianadlt"));
var auth = {"message":"1.5.3","requester":"bda",
            "username":encrypt.encrypt("indianadlt"),
            "requestType":2,
            "password":encrypt.encrypt("indiana2014"),
            "clientDetails":{"os":"Windows 8.1 (build 6.3, amd64)","javaVersion":"1.7.0_75"},"version":"1.5.3"};


var sock = tls.connect(4448,"eebulk.cr.usgs.gov",{
  rejectUnauthorized : false,
  ciphers : "ADH-RC4-MD5",
  secureProtocol : "SSLv23_method",
  secureOptions : "SSL_OP_NO_SSLv2",
  handshakeTimeout : 3000
},function(){
  console.log('client connected',arguments);

  sock.setEncoding("utf-8");
  var bool = sock.write(JSON.stringify(auth) + "\r\n",'utf-8',function(){
    console.log("Write done");
  });
  
  console.log("bool" , bool);
  // setTimeout(function() {
  //   sock.end();
  // },500);
});

sock.on('connect',function() {
  console.log('connected');
});
sock.on('data',function(data) {
  console.log("Data received ",data.toString());
  //var k = new Buffer(data);
});
sock.on('end',function(){
  console.log("Data end ",arguments);
});
sock.on('error',function(){
  console.log("Error " , arguments);
});
sock.on('close',function(){  
  console.log("Closed",arguments);
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

var options = {
  url: 'https://eebulk.cr.usgs.gov:4448',
  agentOptions: {
    // cert: fs.readFileSync(certFile),
    // key: fs.readFileSync(keyFile),
    // Or use `pfx` property replacing `cert` and `key` when using private key, certificate and CA certs in PFX or PKCS12 format:
    // pfx: fs.readFileSync(pfxFilePath),
    username : 'indianadlt',
    requester : 'bda',
    password : 'indiana2014',
    passphrase: 'indiana2014',
    securityOptions: 'SSL_DH_anon_WITH_RC4_128_MD5'
  }
};

// request.get(options,function(){
//   console.dir(arguments); 
// });
