var  sock = require('socket.io-client')('http://localhost:42424');
var msg = {
		r : 'eodnDownload_register' ,
		c : 'eodnDownload_clear',
		p : 'eodnDownload_pushData'
};
sock.on('connect' , function(){
	console.log('connected successfully ');
	sock.emit(msg.r , {
		hashId : 1244 ,
		filename : "helooooo.png",
		totalSize : 100001 ,
		connections : 10 
	});
	
	setInterval(function(){
		// Send progress after every 5 seconds 
		sock.emit(msg.p , { 
			hashId : 1244 ,
			ip : '173.194.123.46',
			offset : 100 ,
			progress : 100
		});
	},5000);	
});

