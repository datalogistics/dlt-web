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
	    progress : 65536
	});
	sock.emit(msg.p, {
	    hashId : 1244,
	    ip : '152.54.15.19',
	    offset : off + 65536,
	    progress : 32768
	});
	sock.emit(msg.p, {
	    hashId : 1244,
	    ip : 'depot1.loc1.tacc.reddnet.org',
	    offset : off + 98304,
	    progress : 49152
	});
	sock.emit(msg.p, {
	    hashId : 1244,
	    ip : 'depot1.loc1.umich.reddnet.org',
	    offset : off + 98304,
	    progress : 262144
	});
	off = off + 360448;
    },1000);
});

