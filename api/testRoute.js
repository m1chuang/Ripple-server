var S3 = require('./service/uploader');
var Pubnub   = require('./service/pubnub');
var express = require('express');
var test = express.Router();
var mongoose     = require( 'mongoose' );
var MOMENT = require('./moment/moModel');
var DEVICE = require('./device/deModel');
var ACTOR = require('./actor');

test.route('/cleardb')
    .post( function(req, res)
    {
        mongoose.connection.collections['actors'].drop( function(err) {
            console.log('collection dropped');
            ACTOR.ensureIndexes(function(){
              console.log('Index ensured');
            });
        });
        mongoose.connection.collections['devices'].drop( function(err) {
            console.log('collection dropped');
            DEVICE.ensureIndexes(function(){
              console.log('Index ensured');
               setTimeout(function()
                      {
                         res.json(
                                {
                                    status:'db cleared.'
                                })
                      },1500);
            });
        });
        mongoose.connection.collections['moments'].drop( function(err) {
            console.log('collection dropped');
            MOMENT.ensureIndexes(function(){
              console.log('Index ensured');

            });

        });


    });
test.route('/group').get(function(req,res){
    Pubnub.group( {}, function(auth_key, allow, deny){
            res.json();
        });
});
test.route('/3frds')
    .post( function( req, res )
    {
         var params =
        {
            my_device_id : req.body.device_id
        };
        Pubnub.twofrds( params, function(auth_key, allow, deny1, deny2){
            res.json(
                    {
                        auth_key: auth_key,
                        friends: [
                            {
                                channel_id: allow,
                                nick_name: "michael"
                            },
                            {
                                channel_id: deny1,
                                nick_name: "angie"
                            },

                            {
                                channel_id: deny2,
                                nick_name: "albee"
                            },
                        ]
                    });
        });
    });


test.route('/pub')
    .post( function( req, res )
    {
        console.log( "pubb");
        Pubnub.pub( req.body.channel, 'hi' );
    });


test.route('/grant')
    .post( function( req, res )
    {
        console.log( "pubb");
        console.log( req.body.channel );
        Pubnub.grant( req.body.channel, function(msg, obj)
        {
              res.json(
                    {
                        status : msg,
                        feedback: obj
                    });
        });

    });

test.route('/sub')
    .post( function(req, res)
    {
        console.log( "pubb");
        Pubnub.subTest(req.body.channel, req.body.msg,function(){
                  res.json(
                    {

                    });
        });
    });

test.route('')
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



test.route('/image')
    .post( function(req, res)
    {
        S3.upload( req.body.image, { key:req.body.key } );

        res.json(
        {
            url:'https://s3-us-west-2.amazonaws.com/glimpsing/'+req.body.key
        })
    });
test.post('/imagem', S3.multipart);
test.route('/imagem')
    .post( function(req, res)
    {


                    res.json(req.body);


    });

module.exports = test