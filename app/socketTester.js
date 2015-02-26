// To test download through socket for downloads.  
// Simluates a download of id 1244
// To execute: node socketTester.js


var  sock = require('socket.io-client')('http://localhost:42424');
var msg = {
		r : 'eodnDownload_register' ,
		c : 'eodnDownload_clear',
		p : 'eodnDownload_pushData'
};
sock.on('connect' , function(){
  console.log('connected successfully ');
  sock.emit(msg.r , {
    hashId : 1244,
    filename : "test_image.tiff",
    totalSize : 16777216,
    connections : 4
  });
  var off = 0;
  setInterval(function(){
    sock.emit(msg.p, { 
	    hashId : 1244,
	    ip : 'dresci.incntre.iu.edu',
	    offset : off,
	    amountRead : 65536
	});
	sock.emit(msg.p, {
	    hashId : 1244,
	    ip : 'pcvm2-2.utahddc.geniracks.net',
	    offset : off + 65536,
	    amountRead : 32768
	});
	sock.emit(msg.p, {
	    hashId : 1244,
	    ip : '155.99.144.103',
	    offset : off + 98304,
	    amountRead : 49152
	});
	sock.emit(msg.p, {
	    hashId : 1244,
	    ip : '152.54.14.7',
	    offset : off + 98304,
	    amountRead : 262144
	});
	off = off + 360448;
    },1000);
});

