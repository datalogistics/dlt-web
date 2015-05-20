var fs = require('fs')
, path = require('path')
, tls = require('tls')
  // , certFile = path.resolve(__dirname, 'ssl/client.crt')
  // , keyFile = path.resolve(__dirname, 'ssl/client.key')
, request = require('request');

var ciphers = tls.getCiphers();
//console.log(ciphers);

var auth = {username : "indianadlt", password : "indiana2014" ,
            requester  : 'bda',
            version : '1.5.3' };
var sock = tls.connect(4448,"eebulk.cr.usgs.gov",{
  rejectUnauthorized : false,
  ciphers : "ADH-RC4-MD5",
  secureProtocol : "SSLv23_method",
  secureOptions : "SSL_OP_NO_SSLv2",
  handshakeTimeout : 30000
},function(){
  console.log('client connected',arguments);  
  sock.setEncoding("utf-8");
  sock.write(JSON.stringify(auth));
  // setTimeout(function() {
  //   sock.end();
  // },500);
}).on('data',function(data) {
  console.log("Data received ",data.toString());
  //var k = new Buffer(data);
}).on('end',function(){
  console.log("Data end ");
}).on('error',function(){
  console.log("Error " , arguments);
}).on('close',function(){  
  console.log("Closed");
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
