// To test download through socket for downloads.  
// Simluates a download of id 1244
// To execute: node socketTester.js


var  sock = require('socket.io-client')('http://localhost:42424');
var msg = {
  r : 'peri_download_register' ,
  c : 'peri_download_clear',
  p : 'peri_download_pushdata'
};
var totalSize = 16777216

var sessionId = String(process.argv[2] || 1244)
var fileName = process.argv[3] || "test_image.tiff"

sock.on('connect' , function(){
  console.log('connected successfully ');
  sock.emit(msg.r , {
    sessionId : sessionId,
    filename : fileName,
    totalSize : totalSize,
    connections : 4
  });

  var offset = 0;
  var intervalId = setInterval(function(){
    console.log("Sending for ", sessionId, fileName)
    sock.emit(msg.p, { 
      sessionId : sessionId,
      ip : 'dresci.incntre.iu.edu',
      offset : offset,
      amountRead : 65536
    });
    sock.emit(msg.p, {
      sessionId : sessionId,
      ip : 'pcvm2-2.utahddc.geniracks.net',
      offset : offset + 65536,
      amountRead : 32768
    });
    sock.emit(msg.p, {
      sessionId : sessionId,
      ip : '155.99.144.103',
      offset : offset + 98304,
      amountRead : 49152
    });
    sock.emit(msg.p, {
      sessionId : sessionId,
      ip : '152.54.14.7',
      offset : offset + 98304,
      amountRead : 262144
    });
    offset = offset + 360448;
    if (offset > totalSize) {
      clearInterval(intervalId)
      sock.emit(msg.c, {sessionId: sessionId})
    }
  },1000);


  
});

