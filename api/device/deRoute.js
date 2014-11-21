var DeviceCtr     = require('./deControl');
var DEVICE    = require('../device/deModel');
var AUTH     = require('../service/auth');
var routeValidator     = require('../service/util').validator.route;
var nconf = require('nconf');

var express = require('express');
var device = express.Router();

/**
**  Middleware
**/
device.use(routeValidator('device','all'));



/**
**  Routes
**/
device.route('/')

   /*
    *   Request when APP is open
    */
    .post( AUTH.registerOrAuth,function( req, res )
    {
        var params =
        {
            token:req.body.auth_token
        };
        var response = function( token, require_login, uuid, pubnub_key, status )
        {
            console.log( 'in res');
            res.status(status).json(
                {
                    auth_token: token,
                    relogin:require_login,
                    pubnub_key:pubnub_key,
                    uuid: uuid,//server channel
                });
        };

    console.log( req.body);

        if(params.token === 'new')// For now, all clients requesting token will be granted
        {
            DeviceCtr.register( params, res, response);
            console.log( 'ttttttt');
        }
        else
        {
            DeviceCtr.login(params, res, response );
        }
    });


device.use(AUTH.authenticate);
device.route('/friends')
    .all(DEVICE.getDevice)
    .post( function( req, res)
    {

        var params =
        {
            device_obj:req.resource_device
        };

        var response = function( err, friends )
        {
            res.json(
                {
                    friends: friends
                });
        };

        DeviceCtr.getFriends( params, response);
    });

device.route('/friends/delete')
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

device.route('/friends/add')
    .post( function( req, res )
    {
        var params =
        {
            my_device_id : req.body.device_id,
            target_mid :  req.body.target_id
        };
        //@@@ add friend using alternative methonds, ex QR

    });


device.route('/explore/:page')
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


module.exports = device