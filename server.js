/*
 * Server App
 * server.js
 */

var fs = require('fs');

// Setup a files and directories if missing so node don't complain/crash
var logdir = './logs';
if (!fs.existsSync(logdir)){fs.mkdirSync(logdir)}
var local_config = 'config.js'
if (!fs.existsSync(local_config)){fs.closeSync(fs.openSync(local_config, 'w'))}


// include modules
var express = require('express')
  , http = require('http')
  , https = require('https')
  , socketio = require('socket.io')
  , cors = require('cors');
var compression = require('compression');
var cluster = require('cluster');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var ejs = require('ejs');
var cfg = require('./properties');
var multer = require('multer');
// create app, server, sockets
var app = module.exports = express();
var methodOverride = require('method-override');
var errorhandler = require('errorhandler');

// app configuration
app.set('port', cfg.port);
app.use(express.static(__dirname + '/public'));
app.use(favicon(__dirname + '/public/images/osiris_icon.ico'));
app.use(cookieParser("iei122ei12!@&#*(!@#ansdajsdnajs213"));
app.use(session({
  cookie : {maxAge : 60001 },
  saveUninitialized: false, // don't create session until something stored,
  resave: false, // Don't save until modified
  secret: '111121212123419&789'
}));

app.set('views', './views')
app.set('view engine', 'ejs');
app.engine('html', ejs.renderFile);
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
app.use(cors());
// restful api routes
require('./app/routes')(app);

// create http server and listen on a port
// var numCPUs = require('os').cpus().length;
// if (cluster.isMaster) {
//   for (var i = 0; i < numCPUs; i++) {
//     cluster.fork();
//   };
//   cluster.on('exit', function(worker, code, signal) {
//     console.log('worker ' + worker.process.pid + ' died');
//     cluster.fork();
//   });
// }
var server;
var tls = require('tls');
function getSecureContext (domain) {
  if (!cfg.sslOpt[domain])
    return tls.createSecureContext({
      key: fs.readFileSync(cfg.ssl.key),
      cert: fs.readFileSync(cfg.ssl.cert),
      ca: fs.readFileSync(cfg.ssl.ca)
    }).context;

  var key = cfg.sslOpt[domain].key,
      cert = cfg.sslOpt[domain].cert,
      ca = cfg.sslOpt[domain].ca;

  return   tls.createSecureContext({
    key:  fs.readFileSync(key),
    cert: fs.readFileSync(cert)
    // ca:  [fs.readFileSync(ca),]
  }).context;
};
// http://stackoverflow.com/questions/12219639/is-it-possible-to-dynamically-return-an-ssl-certificate-in-nodejs#answer-20285934
if (cfg.ENABLE_HTTPS) {
  var httpolyglot = require('httpolyglot');
  var crypto = require('crypto');
  //read them into memory
  var secureContext = {
    'default' : getSecureContext("")
  };
  for (var i in (cfg.sslOpt  || {})) {
    secureContext[i] = getSecureContext(i);
  }
  var httpsOptions = {
    SNICallback: function (domain,cb) {
      cb(null,secureContext[domain] || secureContext['default']);
    },
    key: fs.readFileSync(cfg.ssl.key),
    cert: fs.readFileSync(cfg.ssl.cert),
    ca: fs.readFileSync(cfg.ssl.ca),
    requestCert: true,
    rejectUnauthorized: false
  };
  var proto;
  if (app.get('port') == 80) {
    app.set('port',443);
    proto = https;
    http.createServer(function(req,res) {
      res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
      res.end();
    }).listen(80);
    server = https.createServer(httpsOptions,app);
  } else {
    server = httpolyglot.createServer(httpsOptions, function(req,res) {
      if (!req.socket.encrypted) {
	// Redirect to https
	console.log(req.url,req.headers['host']);
	res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
	res.end();
      } else {
	app.apply(app,arguments);
      }
    });
  }
} else {
  server = http.createServer(app);
}
var io = socketio.listen(server);
io.sockets.setMaxListeners(0);
server.listen(app.get('port'), function(){
  console.log('HTTP server on port ' + app.get('port') + ' - running as ' + app.settings.env);
});

// setup socket.io communication
io.sockets.on('connection', require('./app/sockets'));
io.sockets.on('connection', require('./app/downloadSockets'));
