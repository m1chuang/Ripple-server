var express = require('express');
var app     = express();
var bodyParser  = require('body-parser');
var mongoose   = require('mongoose');
var S3 = require('../controller/s3_uploader');

mongoose.connect('mongodb://neshorange:Nesh6502@ds039850.mongolab.com:39850/glimpse-test');

var Pubnub   = require(__dirname +'/app/controller/pubnub');
var DeviceCtr     = require(__dirname +'/app/controller/device');
var MomentCtr     = require(__dirname +'/app/controller/moment');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

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

router.route('/moment/explore')
    /*
    *   Get update on explore list, etc
        TODO:
            finish getExplore
    */
    .post( function( req, res )
    {
        var params =
        {
            my_device_id :req.body.device_id,
            skip : req.body.skip,
            offset : req.body.offset
        }

        MomentCtr.getNewExplore( params,
            function( err, explore_list )
            {
                console.log(explore_list);
                res.json(
                    {
                        explore: explore_list
                    });
            });
    });

router.route('/moment/explore/:page')
    /*
    *   Get pagination on explore list
    */
    .post( function( req, res )
    {
        var params =
        {
            my_device_id :req.body.device_id,
            skip : 10*req.params.page,
            offset : 10
        }

        MomentCtr.getPageExplore( params,
            function( err, explore_list )
            {
                console.log(explore_list);
                res.json(
                    {
                        explore: explore_list
                    });
            });
    });


router.route('/moment/')
    /*
    *   Initiate a moment, request when photo taken
    *   TODO:
            posting multiple moment, determine active one
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
                        status: device
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
            function onLogin( err, mo, device )
            {
                //console.log('login');
                // console.log(device.moments[0]);
                //console.log(device);
                res.json(
                    {
                        explore: mo.explore,
                        friends: device.friends
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

router.route('/test')
    .get( function()
    {
        res.json(
            {
                fname : 'info',
                lname : 'info'
            });
    })
    .post( function()
    {
        res.json(
        {
            fname: req.body.fname,
            lname: req.body.lname,
        })
    })

router.route('/image')
    .post( function()
    {
        S3.upload( req.body.image, { key:req.body.key } );
        res.json(
        {
            url:'https://s3-us-west-2.amazonaws.com/glimpsing/'+req.body.key
        })
    })


app.use('/api', router);
app.listen(port);

