var MOMENT = require('../model/momentModel');
var EXPLORE = require('../model/exploreModel');
var DEVICE = require('../model/deviceModel');
var S3 = require('../controller/s3_uploader');
var PUBNUB = require('../controller/pubnub');


var CHALK =  require('chalk');
var async = require('async');
var time = require('moment');
var uuid = require('node-uuid');

/*
*   Upload photo and create a temporary moment
*/
exports.init = function( params, next )
{
    console.log( CHALK.red('In MOMENT.init') );
    DEVICE.findOne( { device_id: params['my_device_id'] },
        function onFind( err, device )
        {
            if( !device )
            {
                console.error( device );
                next( err, device );
            }
            else
            {
                var moment_id = uuid.v4();
                params['mid']=moment_id;
                S3.upload( params['image'], { key:moment_id } );
                var moment = new MOMENT(
                {
                     mid :           moment_id,
                     device_id :     params['device_id'],
                     image_url :     'https://s3-us-west-2.amazonaws.com/glimpsing/'+moment_id,
                     complete :      false,
                     date :          time(),
                     status :        '',
                     location :      [params['lat'], params['lon']]
                });

                device.moments.set( 0, moment );
                device.save(
                    function onDeviceSave( err, device )
                    {
                        next( err,device )
                    });
            }
        });
}

/*
*   Finalize the temporary moment
*/
exports.login = function( params, next )
{
    console.log( CHALK.red('In MOMENT.login') );

    DEVICE.findOne( { device_id: params['my_device_id'] },
        function onFind(err,device)
        {
            if( !device )
            {
                console.log('not found');
                console.error( device );
                next( err, device );
            }
            else
            {
                console.log('found');
                var temp_moment = device.moments[0];
                var moment = new MOMENT(
                {
                     mid :           temp_moment.mid,
                     device_id :     temp_moment.device_id,
                     image_url :     temp_moment.image_url,
                     complete :      true,
                     date :          temp_moment.time,
                     status :        params['status'],
                     location :      temp_moment.location
                });

                moment.getNear( params,
                    function prepareExploreList( err, obj )
                    {
                        moment.createExplore( obj,
                            function saveExploreList( err, explore_list)
                            {
                                moment.explore = explore_list;
                                MOMENT.create( moment,
                                    function onMomentCreate( err, obj1 )
                                    {
                                        next( err, obj1, device );
                                    });
                            });
                    });
            }
        });
}


exports.getExplore = function( params, next )
{

}


/*
*   Check if a like relation with the target is already place in your relations
*   if yes, create the connection. Otherwise, place a like relation in the target's relations
*/
exports.like = function( params, next )
{
    MOMENT.getRelation( params['like_mid'], params['my_device_id'],
        function connectOrCreate( err, my_moment )
        {
            if( my_moment.like_relation.length != 0 )
            {
                console.log('found');
                PUBNUB.createConversation(
                    function addConnections( channel_id, initator_auth_key, target_auth_key )
                    {

                        my_moment.addConnection(
                            {
                                type       : 'like',
                                channel_id : channel_id,
                                auth_key   : initator_auth_key
                            },
                            function( err, obj){} );

                        MOMENT.addRemoteConnection(
                            {
                                target_mid  : params['like_mid'],
                                owner_mid   : my_moment.mid,
                                type        : 'like',
                                channel     : channel_id,
                                auth_key    : target_auth_key
                            },
                            function( err, obj ){});
                    });
            }
            else
            {
                MOMENT.addRemoteRelation( params['like_mid'], obj.mid, function(){} );
                console.log( 'not found' );
            }

            next( err, obj );
        });
}

