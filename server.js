var express = require('express');
var app     = express();
var bodyParser  = require('body-parser');
var mongoose   = require('mongoose');

mongoose.connect('mongodb://neshorange:Nesh6502@ds039850.mongolab.com:39850/glimpse-test'); // connect to our database

var Pubnub   = require(__dirname +'/app/controller/pubnub');
var DeviceCtr     = require(__dirname +'/app/controller/device');
var MomentCtr     = require(__dirname +'/app/controller/moment');


app.use(bodyParser());

var port = process.env.PORT || 8000;

var router = express.Router();




router.route('/device')

   /*
    *   Request when APP is open
    */
    .post( function( req, res )
    {

        var params =
        {
            device_id : req.body.device_id
        }
        console.log('params');
        console.log(params);
        DeviceCtr.findOrCreate( params,
            function( err, device, status )
            {
                console.log('out device');
                console.log(device);
                res.status(status).json(
                    {
                        server_auth_key: device.server_auth_key
                    });

            }
        )
    });



router.route('/moment')

    /*
    *   Get update on explore list, etc
        TODO:
            finish getExplore
    */
    .get( function( req, res )
    {
        var params =
        {
            my_device_id : req.body.device_id,
            skip : req.body.skip,
            offset : req.body.offset
        }

        MomentCtr.getExplore( params,
            function( explore_list )
            {
                res.json(
                    {
                        explore: explore_list
                    });
            });
    })

    /*
    *   Initiate a moment, request when photo taken
    *   TODO:
            finish return value
    */
    .post( function( req, res )
    {
        var params =
        {
            my_device_id : req.body.device_id,
            image   :   req.body.image,
            lat : req.body.lat,
            lon : req.body.lon
        }
        MomentCtr.init( params,
            function onInit( err, device )
            {
                res.json(
                    {
                        device: device
                    });

            });
    })

    /*
    *   Complete a moment and login
        TODO:
            finish return value
    */
    .put( function( req, res )
    {
        var params =
        {
            my_device_id : req.body.device_id,
            status : req.body.status,
            skip : 0,
            offset : 20
        }
        MomentCtr.login( params,
            function onLogin( err, explore_list, device )
            {
                console.log('login');
                console.log(explore_list);
                res.json(
                    {
                        explore_list: explore_list,
                        friend_list: []
                    });


            });
    });


router.route('/like')
    .post( function( req, res )
    {
        var params =
        {
            like_mid : req.body.like_mid,
            my_device_id : req.body.device_id
        }

        MomentCtr.like( params,
            function onLike( err, device )
            {
                res.json(
                    {
                        status : device,
                    });

            });
    });



router.route('/pub')
    .post( function( req, res )
    {
        console.log( "pubb");
        Pubnub.pub( req.body.channel, 'hi' );
    });


router.route('/grant')
    .post( function( req, res )
    {
        console.log( "pubb");
        Pubnub.grant( req.body.channel, 'hi' );
    });

router.route('/sub')
    .post( function(req, res)
    {
        console.log( "pubb");
        Pubnub.subscribe(req.body.channel, req.body.key,function(info){
                  res.json(
                    {
                        status : info,
                    });
        });
    });




app.use('/api', router);
app.listen(port);

