// To test download through socket for downloads.  
// Simluates a download of id 1244
// To execute: node socketTester.js


var  sock = require('socket.io-client')('http://localhost:42424');
var msg = {
  r : 'eodnDownload_register' ,
  c : 'eodnDownload_clear',
  p : 'eodnDownload_pushData'
};
var totalSize = 16777216
sock.on('connect' , function(){
  console.log('connected successfully ');
  sock.emit(msg.r , {
    hashId : 1244,
    filename : "test_image.tiff",
    totalSize : totalSize,
    connections : 4
  });

  var offset = 0;
  var intervalId = setInterval(function(){
    sock.emit(msg.p, { 
      hashId : 1244,
      ip : 'dresci.incntre.iu.edu',
      offset : offset,
      amountRead : 65536
    });
    sock.emit(msg.p, {
      hashId : 1244,
      ip : 'pcvm2-2.utahddc.geniracks.net',
      offset : offset + 65536,
      amountRead : 32768
    });
    sock.emit(msg.p, {
      hashId : 1244,
      ip : '155.99.144.103',
      offset : offset + 98304,
      amountRead : 49152
    });
    sock.emit(msg.p, {
      hashId : 1244,
      ip : '152.54.14.7',
      offset : offset + 98304,
      amountRead : 262144
    });
    offset = offset + 360448;
    if (offset > totalSize) {clearInterval(intervalId);}
  },1000);


  sock.emit(msg.c, {hashId: 1244})
});

