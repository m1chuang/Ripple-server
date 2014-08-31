var express = require('express');
var app     = express();
var bodyParser  = require('body-parser');
var mongoose   = require('mongoose');

var pubnub = require("pubnub").init({
    publish_key   : "demo",//pub-c-afb09cf5-004d-43c6-9074-8bcd52c4e331",
    subscribe_key : "demo",//"sub-c-0b0398ea-30da-11e4-b3c3-02ee2ddab7fe",
    secret_key    : "sec-c-YWY2ZjQyOTgtMjEzNy00YjdmLWIzMzMtZGZiOWQ3MDc0M2Vj",
    origin:"pubsub.pubnub.com"
});



mongoose.connect('mongodb://neshorange:Nesh6502@ds063919.mongolab.com:63919/glimpse'); // connect to our database

var DeviceCtr     = require(__dirname +'/app/controller/device');
var MomentCtr     = require(__dirname +'/app/controller/moment');


app.use(bodyParser());

var port = process.env.PORT || 8000;

var router = express.Router();




router.route('/device')
    .post(function(req, res) {
        console.log(req.body);
        DeviceCtr.findOrCreate(req, res,function(err, device){

            console.log(device);
            res.json({
                device: device
            });

        })
    });


router.route('/moment')
    .post(function(req, res) {
        MomentCtr.init(req, res,function(err, device){

            res.json({
                server_channel_id:'abcd',
                device: device
            });
        })
    })
    .put(function(req, res) {
        MomentCtr.login(req, res,function(err, moment){

            MomentCtr.near(moment,req, res,function(err, list){

                res.json({
                    explore_list: list,
                    friend_list: []
                });
            });

        })
    });

router.route('/test')
    .post(function(req, res){
        var message = { "some" : "data" };
        pubnub.publish({
            channel   : 'my_channel',
            message   : message,
            callback  : function(e) { console.log( "SUCCESS!", e ); },
            error     : function(e) { console.log( "FAILED! RETRY PUBLISH!", e ); }
        });
    });








app.use('/api', router);
app.listen(port);

