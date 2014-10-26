var MOMENT = require('./moModel');
var DEVICE = require('../device/deModel');
var S3 = require('../service/uploader');
var PUBNUB = require('../service/pubnub');
var LOG = require('../service/logger');

var CHALK =  require('chalk');
var async = require('async');
var time = require('moment');
var uuid = require('node-uuid');

/*
*   Upload photo and create a temporary moment
*/
exports.init = function(device, params, next )
{
    console.log( CHALK.red('In MOMENT.init') );
    var moment_id = uuid.v4();
    S3.upload( params['image'], { key:moment_id } );
    var temp_moment = new MOMENT(
    {
         mid :           moment_id,
         device_id :     device.device_id,
         pubnub_auth_key : device.pubnub_auth_key,
         secret_key      : uuid.v4,
         image_url :     'https://s3-us-west-2.amazonaws.com/glimpsing/'+moment_id+'.jpg',
         complete :      false,
         date :          time(),
         status :        '',
         location :      [params['lon'], params['lat']],
         explore:        [],
         liked_relation  : []
    });

    params['offset'] = 0;
    params['limit'] = 20;
    params['my_moment_secret_key'] = temp_moment.secret_key;
    temp_moment.getNear( params,
        function prepareExploreList( err, obj )
        {
            temp_moment.createExplore( params, obj,
                function saveExploreList( err, explore_list)
                {
                    temp_moment.explore = explore_list;
                    device.moments.set( 0, temp_moment );
                    device.save();
                });
        });

    next( 202 );
}

/*
*   Finalize the temporary moment
*/
exports.login = function( device, params, next )
{
    console.log( CHALK.red('In MOMENT.login') );

    var temp_moment = device.moments[0];
    console.log( device);
    var new_moment = new MOMENT(
    {
         mid :           temp_moment.mid,
         device_id :     temp_moment.device_id,
         pubnub_auth_key : temp_moment.pubnub_auth_key,
         secret_key      : temp_moment.secret_key,
         image_url :     temp_moment.image_url,
         complete :      true,
         date :          temp_moment.date,
         explore :       temp_moment.explore,
         liked_relation : [],
         status :        params['status'],
         location :      temp_moment.location
    });

    MOMENT.create( new_moment,
        function( err, mo )
        {
            async.filter(device.friends, function(friend)
            {
                return {

                        nick_name: friend.nick_name,
                        channel_id : friend.channel_id,
                        moments : friend.moments,
                    }
            },
            function(friend_list)
            {
                async.filter(mo.explore, function(ex)
                {
                    return {
                            action_like : ex.action_like,
                            image_url   : ex.image_url,
                            distance    : ex.distance,
                            status      : ex.status,
                            like        : ex.like,
                            connect     : ex.connect,
                            chat_channel: ex.chat_channel
                        }

                }, function(explore_list)
                {
                    next( err, explore_list, friend_list, 200 );
                });
            });
            //notify friends@@@
            //PUBNUB.brodcast(device, 'login');
        });

}


var calDistance = function (lat1, lon2, lat2, lon2)
{
    var R = 6371; // km
    var d = Math.acos(Math.sin(lat1)*Math.sin(lat2) +
                  Math.cos(lat1)*Math.cos(lat2) *
                  Math.cos(lon2-lon1)) * R;
    return d
}



exports.doAction = function( params, res, next )
{
    /*
    *   Check if a like relation with the target is already place in your relations
    *   if yes, create the connection. Otherwise, place a like relation in the target's relations
    */
    var action = {
        like: function(params, next)
        {
            var target_mid = params['action_token']['target_mid'],
                target_did = params['action_token']['target_did'],
                target_secret = params['action_token']['target_secret'],
                my_did = params['my_device_id'];

            MOMENT.getRelation( target_mid, my_did, target_secret, res,
                function connectOrRequset( err, status, my_moment, target_info )
                {
                    if( status =='liked' )
                    {
                        PUBNUB.createConversation( my_moment['pubnub_key'],target_info['target_pubnub_key'],
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
                                        target_mid  : target_mid,
                                        target_did : target_did,
                                        owner_mid   : my_moment.mid,
                                        type        : 'like',
                                        channel     : channel_id,
                                    },
                                    function( err, target_moment )
                                    {
                                        DEVICE.saveFriend( params['target_did'],
                                            {
                                                device_id: params['my_device_id'],
                                                nick_name: '',
                                                channel_id : params['channel_id'],
                                                moments : [{
                                                    image: my_moment.image_url,
                                                    status: my_moment.status,
                                                    distance: target_info['target_distance'],
                                                }]
                                            });

                                        DEVICE.saveFriend( params['my_device_id'],
                                            {
                                                device_id: target_did,
                                                nick_name: '',
                                                channel_id : channel_id,
                                                moments: [{
                                                    image: target_moment.image_url,
                                                    status: target_moment.status,
                                                    distance: target_info['target_distance'],
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
                        MOMENT.addRemoteRelation( target_mid, my_moment, function(){} );
                        next( err, 2, {});
                    }

                });
        },
    };
    action[params['action_token']['action']](params, next);
}

