var DeviceCtr     = require('./deControl');
var AUTH     = require('../service/auth');
var validator = require('is-my-json-valid');
var nconf = require('nconf');

var express = require('express');
var device = express.Router();


/**
**  Input Validation & Authentication
**/
device.use(function(req,res,next)
    {
        var validate = validator(nconf.get('validation')['device']['all']);
        validate(req.body)? next() : res.status( 400 ).json({ errs : validate.errors });
    });

device.use(AUTH.authenticate);

/**
**  Routes
**/
device.route('/')
   /*
    *   Request when APP is open
    */
    .post( function( req, res )
    {
        var response = function( err, token, status )
        {
            res.status(status).json(
                {
                    token: token
                });
        };

        if(req['auth_token'] == 'new')// For now, all clients requesting token will be granted
        {
            DeviceCtr.create( response);
        }
        else
        {
            response('', req.body.token, 200);
        }
    });

device.route('/friends')
    .post( function( req, res)
    {
        //@@@ return friend list
        //@@@ show unread updates
        var params =
        {
            my_device_id :req.body.device_id,
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

device.route('/explore')
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