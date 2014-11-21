var MOMENT = require('./moModel');
var DEVICE = require('../device/deModel');
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
exports.initMoment = function( params )
{
    LOG.info( CHALK.red('In MOMENT.init') );
    var device = params.resource_device;
    var actor_id = params.actor_id;
    var newActor = new ACTOR(
    {
         actor_id :      actor_id,
         device_id :     device.device_id,
         pubnub_key :    device.pubnub_key,
         health: "established",
    });

    MOMENT.getExplore( params,
        function saveExploreList( err, explore_list)
        {
            LOG.info( CHALK.red('In MOMENT.init end') );
            newActor.explore = explore_list || [];
            newActor.save();
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
                status:         actor.status,
                pubnub_key:     actor.pubnub_key,
                location: [parseFloat(params.lat), parseFloat(params.lon)],
            });
            mo.save(function(err){LOG.error('eruuuuur');LOG.error(err);});
            // is there duplicates?
            // no

            actor.health = 'completed';
            actor.save();

            AUTH.newAuthToken( {device_id:params.device_id, actor_id:actor.actor_id}, true,
                        function( newToken )
                        {
                            response(201, '', actor.explore, newToken);
                        });


        }
        else if(['pending', 'badimage'].indexOf(latest_moment.health))
        {
            ACTOR.createPending( params, function (actor)
                {
                    actor.save();
                    AUTH.newAuthToken( {device_id:params.device_id, actor_id:actor.actor_id}, true,
                        function( newToken )
                        {
                            response(200,  'Resend image.', actor.explore, newToken);
                        });

                });
        }

    }
    else
    {
        ACTOR.createPending( params, function (actor)
            {
                actor.save();
                AUTH.newAuthToken( {device_id:params.device_id, actor_id:actor.actor_id}, true,
                        function( newToken )
                        {
                            response(200,  'Resend image.', actor.explore, newToken);
                        });
            });
    }

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
            ACTOR.getRelation(target_aid, params.auth_token.actor_id,function(err,actor)
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





//-------------------------V0---------------------------------------//
/*
*   Finalize the temporary moment
*/
exports.loginOld = function(  params, next )
{
    LOG.info( CHALK.red('In MOMENT.login') );
    //ACTOR.findOne({params.})

    var device = params.resource_device;
    LOG.info(device);
    var temp_moment = device.moments[0];
    if (!temp_moment)
    {

    } next('resend data', [],[],400);
    var new_moment = new MOMENT(
    {
         mid :           temp_moment.mid,
         device_id :     temp_moment.device_id,
         pubnub_key : temp_moment.pubnub_key,
         image_url :     temp_moment.image_url,
         timestamp :          temp_moment.date,
         explore :       temp_moment.explore || [],
         status :        params['status'],
         location :      temp_moment.location
    });
    LOG.info('in loginiiiii');
    LOG.info(temp_moment.explore);
    new_moment.save(function( err, mo )
        {
            LOG.info(CHALK.red(err));
            DEVICE.filterFriends(device,
                function(friend_list)
                {

                    next( err, mo.explore,friend_list, 200 );
                });

            //notify friends@@@
            //PUBNUB.brodcast(device, 'login');
        });

}

exports.getNewExplore = function( params, next )
{
    LOG.info( CHALK.red('In MOMENT.getNewExplore') );
    LOG.info('params-');
        LOG.info(params.device_id);
    mongoose.model( 'Moment' ).findOne(
    {
        'device_id': params.device_id
    } ,function(err, mo)
    {
        LOG.info('moment');
       // LOG.info(mo);
        LOG.info(err);
        if( err )
        {
            LOG.info("Device id: '"+params.my_device_id+"' not found");
            next( err, 'device' );
        }
        else
        {
            params.location = mo.location;
            LOG.info('loc');

            mo.getExplore(params,
                function saveExploreList( err, explore_list)
                {
                    LOG.info('explore');
                    LOG.info(explore_list);
                    mo.explore = explore_list;
                    next( err,explore_list );
                    //device.moments.set( 0, mo );
                    mo.save(function( err, obj ){LOG.info('save temp moment:'+err);LOG.info(obj);});
                });

        }
    });

};



exports.doAction_old = function( params,  next )
{
    /*
    *   Check if a like relation with the target is already place in your relations
    *   if yes, create the connection. Otherwise, place a like relation in the target's relations
    */
    var action = {
        like: function(params, next)
        {

            var target_info = params['action_content']['target_info'],
                my_device_id = params['auth_token']['device_id'];

            MOMENT.getRelation( target_info['mid'], my_device_id, res,
                function connectOrRequset( err, status, my_moment )
                {

                    if( status ==='liked' )
                    {
                        PUBNUB.createConversation( my_moment['pubnub_key'],target_info['pubnub_key'],
                            function addConnections( channel_id )
                            {
                                my_connection = {
                                            type       : 'like',
                                            channel_id : channel_id,
                                        };
                                next( err, 0, my_connection );

                                my_moment.addConnection( my_connection,
                                    function( err, my_moment){});

                                MOMENT.addRemoteConnection(
                                    {
                                        target_mid  : target_info.mid,
                                        target_did : target_info.did,
                                        owner_mid   : my_moment.mid,
                                        type        : 'like',
                                        channel     : channel_id,
                                    },
                                    function( err, target_moment )
                                    {
                                        DEVICE.saveFriend( target_info.did,
                                            {
                                                device_id: my_device_id,
                                                nick_name: '',
                                                channel_id : channel_id,
                                                moments : [{
                                                    image: my_moment.image_url,
                                                    status: my_moment.status,
                                                    distance: target_info.distance,
                                                }]
                                            });

                                        DEVICE.saveFriend( my_device_id,
                                            {
                                                device_id: target_info.did,
                                                nick_name: '',
                                                channel_id : channel_id,
                                                moments: [{
                                                    image: target_moment.image_url,
                                                    status: target_moment.status,
                                                    distance: target_info.distance,
                                                }],
                                            });
                                    });
                            });
                    }
                    else if( status ==='already friends')
                    {
                        next( err, 1, {});
                    }
                    else
                    {
                        LOG.info('my_moment');
                        LOG.info(my_moment);
                        MOMENT.addRemoteRelation( target_info['mid'], my_moment, function(){} );
                        next( err, 2, {});
                    }

                });

        }
    };
    action[params.action_token.action](params, next);
}