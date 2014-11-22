var MOMENT = require('./moModel');
var S3 = require('../service/uploader');
var PUBNUB = require('../service/pubnub');
var LOG = require('../service/util').logger;
var mongoose     = require( 'mongoose' );
var CHALK =  require('chalk');
var async = require('async');
var time = require('moment');
var uuid = require('node-uuid');
var AUTH = require('../service/auth');
var ACTOR = require('../actor');
/*
*   Upload photo and create a temporary moment
*/
exports.initMoment = function( params, response )
{
    LOG.info( CHALK.red('In MOMENT.init') );
    console.log( params);
    var device = params.resource_device;
    var actor_id = uuid.v4();
    var newActor = new ACTOR(
    {
         actor_id :      actor_id,
         device_id :     device.device_id,
         pubnub_key :    device.pubnub_key,
         image_url:      params.image_url,
         health: "established",
    });
    AUTH.newAuthToken( {device_id:device.device_id, actor_id:actor_id, lat:params.lat,lon:params.lon}, false,
                        function ( newToken )
                        {
                            response(202, '', newToken);
                        });
    MOMENT.getExplore( params,
        function saveExploreList( err, explore_list)
        {
            LOG.info( CHALK.red('In MOMENT.init end') );
            newActor.explore = explore_list || [];
            newActor.save(function (err){LOG.error('eruuuuur');LOG.error(err);});
        });

};


exports.completeMoment = function(params,response)
{
    var actor = params.resource_actor;
    //actor found, is moment also found and fresh?
    if(actor)
    {
        if(actor.health === 'established')
        {
            //create moment
            LOG.info('completin')
            var mo = new MOMENT({
                actor_id:       actor.actor_id,
                device_id :     actor.device_id,
                image_url :     actor.image_url,
                status:         params.status,
                pubnub_key:     actor.pubnub_key,
                location: [parseFloat(params.lat), parseFloat(params.lon)]
            });
            mo.save(function (err){LOG.error('eruuuuur');LOG.error(err);});
            // is there duplicates?
            // no
            actor.health = 'completed';
            actor.save();
            response(201, '', actor.explore);
        }
        else if(actor.health === 'completed')
        {
            response(304,  'init new moment', actor.explore);
        }
        else if(['pending', 'badimage'].indexOf(actor.health))
        {
            response(200,  'Resend image'+actor.health, actor.explore);
        }
    }
    else
    {
        ACTOR.createPending( params, function (actor)
            {
                actor.save();
                response(200,  'Resend image', actor.explore);

            });
    }

};



exports.getNewExplore = function( params, next )
{

    MOMENT.getExplore( params,
        function ( err, explore_list)
        {
            LOG.info('@@@@@@@@@@@@@@@@@@');
            LOG.info(explore_list);
            next(200, explore_list);
        });
};




exports.doAction = function( params,  next )
{

    var action = {
        /*
        *   Check if a like relation with the target is already place in your relations
        *   if yes, create the connection. Otherwise, place a like relation in the target's relations
        */
        like: function(params, next)
        {

            LOG.info(params.action_token);
            var target_aid = params.action_token.target_info.aid;
            ACTOR.getRelation(target_aid, params.auth_token.actor_id,function (err,actor)
            {
                //LOG.info(actor[0]);
                LOG.info(actor);
                if(err || !actor[0])
                {
                    LOG.info(err);
                    next(404,err);
                }
                else if(actor[0].health === 'completed')
                {
                    if(actor[0].relation[0] && actor[0].relation[0].actor_id === target_aid)
                    {
                        if(actor[0].relation[0].status === 0)
                        {

                            PUBNUB.createConversation( actor.pubnub_key, actor[0].relation[0].pubnub_key,
                            function addConnections( channel_id )
                            {
                                next(202,{
                                    channel_id:channel_id,
                                },'liked by target');
                                actor[0].saveConnection({target_aid:target_aid,type:'like', channel_id:channel_id});
                                ACTOR.saveRemoteConnection({owner_aid:params.auth_token.actor_id, target_aid:target_aid,type:'like', channel_id:channel_id},
                                    function(err, device_id)
                                    {
                                        LOG.info('device_id');
                                        LOG.info(device_id);
                                        PUBNUB.notifyRemote(
                                            {
                                                type                : 'like',
                                                explore_id          : actor[0].relation[0].actor_id,
                                                chat_channel_id          : channel_id,
                                                server_channel_id   : device_id,
                                            },function(){});
                                    });
                            });
                        }
                        else if(actor[0].relation[0].status === 1)
                        {
                            next(304,'already liked target');
                        }
                    }
                    else
                    {
                        actor[0].addRelation({target_aid:target_aid,type:'like', status:1});

                        LOG.info('self');
                        LOG.info(actor[0]);
                        LOG.info('target');
                        LOG.info(target_aid);
                        ACTOR.addRemoteRelation({
                            target_aid:target_aid,
                            pubnub_key:actor[0].pubnub_key,
                            owner_aid:params.auth_token.actor_id,
                            status:0, type:'like'
                        });
                        next(201,'init like');
                    }

                }
                else
                {
                    next(403, '');
                }
            });

        }
    };
    LOG.info(params);
    action[params.action_token.action](params, next);
}


