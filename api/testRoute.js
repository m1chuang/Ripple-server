var S3 = require('./service/uploader');
var Pubnub   = require('./service/pubnub');
var express = require('express');
var test = express.Router();


test.route('/twofrds')
    .post( function( req, res )
    {
         var params =
        {
            my_device_id : req.body.device_id
        };
        Pubnub.twofrds( params, function(auth_key, allow, deny){
            res.json(
                    {
                        auth_key: auth_key,
                        friends: [
                            {
                                channel_id: allow,
                                nick_name: "michael"
                            },
                            {
                                channel_id: deny,
                                nick_name: "angie"
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
        Pubnub.subscribe(req.body.channel, req.body.key,function(info){
                  res.json(
                    {
                        status : info,
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

test.route('/imagem')
    .post( function(req, res)
    {
        var params = {};
        req.busboy.on('file', function(fieldname, file, filename, encoding) {
            console.log('on:file');

            S3.s3_test(fieldname, file, filename, encoding,
                function( err, s3_response) {
                    res.json(
                        {
                            url:'https://glimpsetest.s3.amazonaws.com/'+filename,
                            s3_response:s3_response,
                            params : params
                        });
                });
        });

        req.busboy.on('field', function(fieldname, value, valTruncated, keyTruncated) {
            console.log('on:field');
            console.log(fieldname);
            params[fieldname]=value;

        });
/*
        req.busboy.on('finish', function() {
            console.log('once:end');
            res.end();
        });
*/
        req.pipe(req.busboy);

    });

module.exports = test