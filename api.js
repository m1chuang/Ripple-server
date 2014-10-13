var express = require('express');
var app     = express();
var bodyParser  = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

var busboy = require('connect-busboy');
app.use(busboy());

var nconf = require('nconf');
nconf.argv().env().file({ file: 'config.json' });

var mongoose   = require('mongoose');
mongoose.connect( nconf.get('database') );

var port = process.env.PORT || 8000;
var deviceRoute = require(__dirname +'/app/route/deviceRoute.js');
var momentRoute = require(__dirname +'/app/route/momentRoute.js');
var testRoute = require(__dirname +'/app/route/momentRoute.js');

app.use('/api/moment', deviceRoute);
app.use('/api/device', deviceRoute);
app.use('/api/test', testRoute);

app.listen(port);



