var MomentCtr     = require('./moControl');
var DEVICE    = require('../device/deModel');
var UTIL     = require('../service/util');
var LOG = UTIL.logger;
var routeValidator = require('../service/util').validator.route;
var tokenValidator = require('../service/util').validator.token;
var AUTH     = require('../service/auth');
var ACTOR=require('../actor');
var S3 = require('../service/uploader');
var nconf = require('nconf');
var express = require('express');
var uuid = require('node-uuid');


var moment = express.Router();



/**
**  Input Validation & Authentication
**/
moment.post('/', S3.multipart, routeValidator('moment','post'));
moment.put('/', routeValidator('moment','put'));
moment.post('/action', routeValidator('moment','action'));

moment.use(AUTH.authenticate);


/**
**  Routes
**/
moment.route('/')


    /*
       Initiate a moment, request when photo taken
       TODO:
            posting multiple moment, determine active one
    */
    .post(DEVICE.getDevice, function( req, res )
    {

        var params =
        {
            device_id : req.body.auth_token.device_id,
            resource_device : req.body.resource_device,
            image   :   req.body.image,
            lat : req.body.lat,
            lon : req.body.lon,
            actor_id:req.body.auth_token.actor_id
        };
        LOG.info(req.body);
        var response = function(status)
        {
            res.status(status).json({status:'test'});
        };


        setTimeout(function()
              {
                response(202);
              },3000);
        MomentCtr.initMoment(params);
    })


    /*
       Complete a moment and login
    */
    .put( ACTOR.getActor, function( req, res )
    {

        var params =
        {
            resource_actor : req.body.resource_actor,
            auth_token: req.body.auth_token,
            status : req.body.status,
            lat:    req.body.lat,
            lon:    req.body.lon,
            skip : 0,
            offset : 20
        };

        var response = function(status, msg, explore, newToken)
        {

            res.status(status).json(
                {
                    msg:msg,
                    explore_list: explore || [],
                    newToken: newToken
                });
        };
        console.log(params);
        MomentCtr.completeMoment(params,response);
    });



moment.route('/explore')

    .post( function(req, res)
    {
        var params =
        {
            device_id : req.body.auth_token.device_id,
        };
        MomentCtr.getNewExplore( params,
            function( err, explore_list )
            {
                console.log(explore_list);
                res.json(
                    {
                        explore_list: explore_list
                    });
            });
    })


/*    status code:
        0: succsefully become friends
        1: already friends
        2: waiting to be liked
*/
moment.route('/action')
    .all(AUTH.parseAction)//,tokenValidator('action'))
    .post( function( req, res )
    {
        var params =
        {
            auth_token : req.body.auth_token,//req.body.device_id,
            action_token : req.body.action_token
        };
        LOG.info( 'body');
        LOG.info( req.body);
        var response = function(status, payload)
        {

            res.status(status).json(
                    {
                        payload : payload
                    });
        };

        MomentCtr.doAction( params, response);
    });



module.exports = moment