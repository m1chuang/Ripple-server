var S3 = require('./app/controller/uploader');
var Pubnub   = require(__dirname +'/app/controller/pubnub');
var express = require('express');
var test = express.Router();



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
        Pubnub.grant( req.body.channel, function(msg)
        {
              res.json(
                    {
                        feedback : msg,
                    });
        });s

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

        req.busboy.on('file', function(fieldname, file, filename, encoding) {
            console.log('on:file');

            S3.s3_test(fieldname, file, filename, encoding, function() {
                    });
        });

        req.busboy.on('field', function(fieldname, value, valTruncated, keyTruncated) {
            console.log('on:field');
            console.log(fieldname);
        });

        req.busboy.once('end', function() {
            console.log('once:end');
            //res.send('done');
        });

        req.pipe(req.busboy);

    });

module.exports = test