var MomentCtr     = require('./moControl');
var LOGGER = require('../service/logger');
var AUTH     = require('../service/auth');
var express = require('express');
var moment = express.Router();

moment.use(AUTH.authenticate);
moment.route('/')
    /*
    *   Initiate a moment, request when photo taken
    *   TODO:
            posting multiple moment, determine active one
    */
    .post( function( req, res )
    {
        var params =
        {
            my_device_id : req['auth_token']['device_id'],//req.body.device_id,
            image   :   req.body.image,
            lat : req.body.lat,
            lon : req.body.lon
        };

        var response = function(err, conntent)
        {
            if (err) logger.error(err);
                res.status(status).end();
        };

        MomentCtr.init( params, response);
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
            my_device_id : req['auth_token']['device_id'],//req.body.device_id,
            status : req.body.status,
            skip : 0,
            offset : 20
        };

        var response = function(err, conntent)
        {
            if (err) logger.error(err);
            res.status(status).json(
                {
                    explore: explore,
                    friends: friends
                });
        };

        MomentCtr.login( params,response);
    });

/*

*   status code:
        0: succsefully become friends
        1: already friends
        2: waiting to be liked
*/
moment.route('/like')
    .post( function( req, res )
    {
        var params =
        {
            like_mid : req.body.target_mid,
            my_device_id : req['auth_token']['device_id'],//req.body.device_id,
        };

        MomentCtr.like( params,
            function onLike( err, status, connection )
            {
                if (err) logger.error(err);
                res.json(
                    {
                        status : status,
                        connection : connection
                    });
            });
    });


module.exports = moment