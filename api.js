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
nconf.argv().env().file({ file: __dirname + '/api-config.json' });
var ENV = nconf.get('NODE_ENV');

var LOG     = require('./dist/api/service/util').logger;
LOG.info(ENV);

var mongoose   = require('mongoose');
mongoose.connect( nconf.get('database')[ENV] );


var moment     = require('./dist/api/moment/moRoute');
var device     = require('./dist/api/device/deRoute');
var test     = require('./dist/api/testRoute');


app.use('/dist/api/moment', moment);
app.use('/dist/api/device', device);
app.use('/dist/api/test', test);





function start() {

  var port = process.env.PORT || 8000;
  app.listen(port);

  console.log("Express server listening on port %d in %s mode", port, app.settings.env);
}

// *******************************************************

start();
exports.app = app;
exports.db = mongoose;

