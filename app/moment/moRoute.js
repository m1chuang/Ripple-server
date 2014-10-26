var MomentCtr     = require('./moControl');
var DEVICE    = require('../device/deModel');
var LOG = require('../service/logger');
var AUTH     = require('../service/auth');
var validator = require('is-my-json-valid');
var nconf = require('nconf');
var express = require('express');



var moment = express.Router();



/**
**  Input Validation & Authentication
**/
moment.post('/',function(req,res,next)
    {
        var validate = validator(nconf.get('validation')['moment']['post']);
        validate(req.body)? next() : res.status( 400 ).json({ errs : validate.errors });
    });

moment.put('/',function(req,res,next)
    {
        var validate = validator(nconf.get('validation')['moment']['put']);
        validate(req.body)? next() : res.status( 400 ).json({ errs : validate.errors });
    });
moment.post('/action',function(req,res,next)
    {
        var validate = validator(nconf.get('validation')['moment']['action']);
        validate(req.body)? next() : res.status( 400 ).json({ errs : validate.errors });
    });

moment.use(AUTH.authenticate);



/**
**  Routes
**/
moment.route('/')
    .all(DEVICE.getDevice)


    /*
       Initiate a moment, request when photo taken
       TODO:
            posting multiple moment, determine active one
    */
    .post( function( req, res )
    {
        var params =
        {
            auth_token : req['auth_token'],
            image   :   req.body.image,
            lat : req.body.lat,
            lon : req.body.lon
        };

        var response = function(status)
        {
            res.status(status).end();
        };

        MomentCtr.init( req['resource_device'], params, response);
    })


    /*
       Complete a moment and login
    */
    .put( function( req, res )
    {
        var params =
        {
            my_device_id : req['auth_token']['device_id'],
            status : req.body.status,
            skip : 0,
            offset : 20
        };

        var response = function(err, explore, friends, status)
        {
            if (err) LOG.error(err);
            res.status(status).json(
                {
                    explore: explore || [],
                    friends: friends || []
                });
        };

        MomentCtr.login( req['resource_device'], params,response);
    });

/*    status code:
        0: succsefully become friends
        1: already friends
        2: waiting to be liked
*/
moment.route('/action')
    .all(AUTH.parseAction)
    .post( function( req, res )
    {
        var params =
        {
            my_device_id : req['auth_token']['device_id'],//req.body.device_id,
            action_token : req['action_token']
        };

        MomentCtr.doAction( params, res,
            function onLike( err, status, connection )
            {
                if (err) LOG.error(err);
                res.json(
                    {
                        status : status,
                        connection : connection
                    });
            });
    });



module.exports = moment