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
nconf.argv().env().file({ file: './app/config.json' });

var mongoose   = require('mongoose');
mongoose.connect( nconf.get('database') );


var api = require(__dirname +'/api/api');

app.use('/api/moment', api.moment);
app.use('/api/device', api.device);
app.use('/api/test', api.test);



module.exports = app




