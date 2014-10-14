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
nconf.argv().env().file({ file: 'config.json' });

var mongoose   = require('mongoose');
mongoose.connect( nconf.get('database') );

var port = process.env.PORT || 8000;
var api = require(__dirname +'/app/api');

app.use('/api/moment', api.moment);
app.use('/api/device', api.device);
app.use('/api/test', api.test);

app.listen(port);



