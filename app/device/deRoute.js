var DeviceCtr     = require('./deControl');
var DEVICE    = require('../device/deModel');
var AUTH     = require('../service/auth');
var validator     = require('../service/util').validator;
var nconf = require('nconf');

var express = require('express');
var device = express.Router();

/**
**  Middleware
**/
device.use(validator('device','all'));



/**
**  Routes
**/
device.route('/')

   /*
    *   Request when APP is open
    */
    .post( AUTH.registerOrAuth,function( req, res )
    {
        var response = function( err, token, require_login, uuid, pubnub_key, status )
        {
            res.status(status).json(
                {
                    auth_token: token,
                    require_login:require_login,
                    pubnub_key:pubnub_key,
                    uuid: uuid
                });
        };

        if(req.body.auth_token == 'new')// For now, all clients requesting token will be granted
        {
            DeviceCtr.createOrRenew( req, res, response);
        }
        else
        {
            response('', req.body.auth_token, '', '', '', 200);
        }
    });


device.use(AUTH.authenticate);
device.route('/friends')
    .all(DEVICE.getDevice)
    .post( function( req, res)
    {
        //@@@ return friend list
        //@@@ show unread updates
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