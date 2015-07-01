/*
 * Server App
 * server.js
 */

// include modules
var express = require('express')
  , http = require('http')
  , socketio = require('socket.io')
  , cors = require('cors');
var compression = require('compression');
var cluster = require('cluster');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
// create app, server, sockets
var app = module.exports = express();
var server = http.createServer(app);
var io = socketio.listen(server);
var methodOverride = require('method-override');
var errorhandler = require('errorhandler');
var multer = require('multer');
io.sockets.setMaxListeners(0);
// app configuration
app.set('port', process.env.PORT || 42424);
app.use(express.static(__dirname + '/public'));
app.use(favicon(__dirname + '/public/images/favicon.ico'));
app.use(cookieParser());
app.use(session({
  cookie : {maxAge : 60000 },
  saveUninitialized: false, // don't create session until something stored,
  resave: false, // Don't save until modified
  secret: '121212123419&789'
}));

app.use(logger('dev'));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride());
app.use(compression());
app.use(multer()); // for parsing multipart/form-data

// configure enviroments
if ('development' == app.get('env')) {  
  app.use(errorhandler({ dumpExceptions: true, showStack: true }));
} else if ('production' == app.get('env')) {
  app.use(errorhandler());
};

//Enable CORS on all routes
app.use(cors())
// restful api routes
require('./app/routes')(app);

// create http server and listen on a port
var numCPUs = require('os').cpus().length;
if (false && cluster.isMaster) {
  for (var i = 0; i < numCPUs; i++) {
    cluster.fork();
  };
  cluster.on('exit', function(worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died');
    cluster.fork();
  });
} else {  
  server.listen(app.get('port'), function(){
    console.log('HTTP server on port ' + app.get('port') + ' - running as ' + app.settings.env);
  });

  // setup socket.io communication
  io.sockets.on('connection', require('./app/sockets'));
  io.sockets.on('connection', require('./app/downloadSockets'));
}
