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
nconf.argv().env().file({ file: __dirname + '/config.json' });

var mongoose   = require('mongoose');
mongoose.connect( nconf.get('database') );


var moment     = require('./moment/moRoute');
var device     = require('./device/deRoute');
var test     = require('./testRoute');


app.use('/api/moment', moment);
app.use('/api/device', device);
app.use('/api/test', test);



module.exports = app




