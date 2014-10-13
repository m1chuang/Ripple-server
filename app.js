//var Busboy = require('connect-busboy');
var express = require('express');
var app     = express();
var bodyParser  = require('body-parser');
var formidable = require('formidable');
var util = require('util');
//var awsUpload = require('./app/controller/aws-streaming');
var busboy = require('connect-busboy');
var mongoose   = require('mongoose');
var S3 = require('./app/controller/s3_uploader');

mongoose.connect('mongodb://neshorange:Nesh6502@ds039850.mongolab.com:39850/glimpse-test');

var Pubnub   = require(__dirname +'/app/controller/pubnub');
var DeviceCtr     = require(__dirname +'/app/controller/device');
var MomentCtr     = require(__dirname +'/app/controller/moment');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(busboy());


//app.use(busboy());

//app.use(express.methodOverride());

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
        };

        DeviceCtr.findOrCreate( params,
            function( err, device, status )
            {
                console.log(device);
                res.status(status).json(
                    {
                        server_auth_key: device.server_auth_key
                    });
            });
    });

router.route('/device/friends')
    .post( function( req, res)
    {
        //@@@ return friend list
        //show unread updates
        var params =
        {
            my_device_id :req.body.device_id,
        };

        DeviceCtr.getFriends( params,
            function( err, friends )
            {
                console.log(friends);
                res.json(
                    {
                        friends: friends
                    });
            });
    });

router.route('/device/friends/delete')
    .post( function( req, res )
    {
        var params =
        {
            my_device_id : req.body.device_id,
            target_mid :  req.body.target_id
        };
        DeviceCtr.unFriend( params,
            function( err, status )
            {
                res.json(
                    {
                        status: status
                    });
            })

    });

router.route('/device/friends/add')
    .post( function( req, res )
    {
        var params =
        {
            my_device_id : req.body.device_id,
            target_mid :  req.body.target_id
        };
        //@@@ add friend using alternative methonds, ex QR

    });

router.route('/device/explore')
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
        };

        DeviceCtr.getNewExplore( params,
            function( err, explore_list )
            {
                console.log(explore_list);
                res.json(
                    {
                        explore: explore_list
                    });
            });
    });

router.route('/device/explore/:page')
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
        };

        DeviceCtr.getPageExplore( params,
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
        };

        MomentCtr.init( params,
            function onInit( err, status )
            {
                res.json(
                    {
                        status: status
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
        };

        MomentCtr.login( params,
            function onLogin( err, explore, friends )
            {
                res.json(
                    {
                        explore: explore,
                        friends: friends
                    });
            });
    });

/*
*   status code:
        0: succsefully become friends
        1: already friends
        2: waiting to be liked
*/
router.route('/like')
    .post( function( req, res )
    {
        var params =
        {
            like_mid : req.body.target_mid,
            my_device_id : req.body.device_id
        };

        MomentCtr.like( params,
            function onLike( err, status, connection )
            {
                res.json(
                    {
                        status : status,
                        connection : connection
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
        console.log( req.body.channel );
        Pubnub.grant( req.body.channel, 'hi' );
        res.json(
                    {
                        status : '',
                    });
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
    .get( function(req, res)
    {
        res.json(
            {
                fname : 'info',
                lname : 'info'
            });
    })
    .post( function(req, res)
    {
        res.json(
        {
            fname: req.body.fname,
            lname: req.body.lname,
        })
    })

router.route('/image')
    .post( function(req, res)
    {
        S3.upload( req.body.image, { key:req.body.key } );

        res.json(
        {
            url:'https://s3-us-west-2.amazonaws.com/glimpsing/'+req.body.key
        })
    });

router.route('/imagem')
    .post( function(req, res)
    {
        //S3.upload( req.body.image, { key:req.body.key } );
    req.busboy.on('file', function(fieldname, file, filename) {
    console.log('on:file');
    console.log(file);
    //console.log(filename);
    //console.log(fieldname);
  });

  req.busboy.on('field', function(fieldname, value, valTruncated, keyTruncated) {
    console.log('on:field');
  });

  req.busboy.once('end', function() {
    console.log('once:end');
    res.send('done');
  });

  req.pipe(req.busboy);
            //var data =  new Buffer( req.body.data, 'binary' )
        //console.log(data);


        /*
        awsUpload(req, function(err, url) {
            res.json(
            {
                url:url
            });
        });
*/

    });


app.use('/api', router);
app.listen(port);

