var express = require('express');
var app     = express();

var busboy = require('connect-busboy');
app.use(busboy());

var bodyParser  = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

var nconf = require('nconf');
nconf.argv().env().file({ file: __dirname + '/api/config.json' });
var ENV = nconf.get('NODE_ENV');

var LOG     = require('./api/service/util').logger;
LOG.info(ENV);

var mongoose   = require('mongoose');
mongoose.connect( nconf.get('database')[ENV] );


var moment     = require('./api/moment/moRoute');
var device     = require('./api/device/deRoute');
var test     = require('./api/testRoute');


app.use('/api/moment', moment);
app.use('/api/device', device);
app.use('/api/test', test);





function start() {

  var port = process.env.PORT || 8000;
  app.listen(port);

  console.log("Express server listening on port %d in %s mode", port, app.settings.env);
}

// *******************************************************

start();
exports.app = app;
exports.db = mongoose;

