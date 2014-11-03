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

/*
*   Upload photo and create a temporary moment
*/
exports.init = function( params )
{
    LOG.info( CHALK.red('In MOMENT.init') );
    var device = params.resource_device;
    LOG.info(params);
    LOG.info(device);
    var moment_id = uuid.v4();
    LOG.info('@@@@@@emi');
    LOG.info(device.device_id);
    var temp_moment = new MOMENT(
    {
         mid :           moment_id,
         device_id :     device.device_id,
         pubnub_key :    device.pubnub_key,
         image_url :     params.image,
         timestamp :     time(),
         location :      [params.lon, params.lat],
    });

    temp_moment.getExplore( params,
        function saveExploreList( err, explore_list)
        {
            LOG.info('@@@@@@explore_list');
            LOG.info(explore_list);
            LOG.info(temp_moment);
            temp_moment.explore = explore_list || [];
            device.moments.set( 0, temp_moment );
            device.save(function( err, obj ){LOG.info('save temp moment:'+err);LOG.info(obj);});
        });

};

/*
*   Finalize the temporary moment
*/
exports.login = function(  params, next )
{
    LOG.info( CHALK.red('In MOMENT.login') );

    var device = params.resource_device;
    LOG.info(device);
    var temp_moment = device.moments[0];
    if (!temp_moment) next('resend data', [],[],400);
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

exports.doAction = function( params, res, next )
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

            LOG.info('params in do action');
            LOG.info(params);
            LOG.info('target_info');
            LOG.info(params['action_token']['encrypted']['target_info']);
            LOG.info(target_info['mid']);

            MOMENT.getRelation( target_info['mid'], my_device_id, res,
                function connectOrRequset( err, status, my_moment )
                {
                    LOG.info('like satus');
                        LOG.info(status);
                    if( status =='liked' )
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
                    else if( status =='already friends')
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
        },
    };
    action[params['action_token']['action']](params, next);
}

