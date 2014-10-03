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
                     device_id :     params['my_device_id'],
                     image_url :     'https://s3-us-west-2.amazonaws.com/glimpsing/'+moment_id,
                     complete :      false,
                     date :          time(),
                     status :        '',
                     location :      [params['lon'], params['lat']],
                     explore:        [],
                     like_relation  : []
                });

                params['offset'] = 0;
                params['limit'] = 20;
                params['my_mid'] = moment_id;
                moment.getNear( params,
                    function prepareExploreList( err, obj )
                    {                                                
                        moment.createExplore( obj,
                            function saveExploreList( err, explore_list)
                            {
                                moment.explore = explore_list;
                                device.moments.set( 0, moment );                                                                
                                device.save(
                                    function onDeviceSave( err, device )
                                    {
                                        //no need to wait
                                        //next( err,device )
                                    });
                            });
                    });

                next(err,204);
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
                     date :          temp_moment.date,
                     explore :       temp_moment.explore,
                     like_relation : [],
                     status :        params['status'],
                     location :      temp_moment.location
                });
                
                MOMENT.create( moment,
                    function onMomentCreate( err, obj1 )
                    {
                        next( err, obj1, device );
                    });
            }
        });
}


exports.getNewExplore = function( params, next )
{
    console.log( CHALK.red('In MOMENT.getNewExplore') );

    DEVICE.findOne( { device_id: params['my_device_id'] },
        function onFind(err,device)
        {
            if( !device )
            {
                console.log('not found');
                next( err, device );
            }
            else
            {
                var moment = device.moments[0];
                params['location'] = moment.location;
                params['my_mid'] = moment.mid;

                moment.getNearWithRelation( params,
                    function prepareExploreList( err, obj )
                    {                                                
                        moment.createExplore( obj,
                            function saveExploreList( err, explore_list)
                            {
                                moment.explore = explore_list;
                                console.log('moment');
                                //console.log(moment);
                                console.log(explore_list);
                                next( err,explore_list )
                                device.moments.set( 0, moment );                                                                
                                device.save(
                                    function onDeviceSave( err, device )
                                    {
                                        
                                    });

                            });
                    });
            }
        });
}


exports.getPageExplore = function( params, next )
{
    console.log( CHALK.red('In MOMENT.getPageExplore') );

    DEVICE.findOne( 
        { 
            'device_id': params['my_device_id'] 
        },
        function( err, device )
        {  
            if (err) throw err;                    
            next( err, device.moments[0].explore);
        });
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
            
            if( my_moment != null && my_moment.like_relation != undefined && my_moment.like_relation.length != 0 )
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
                            function( err, my_moment){} );

                        MOMENT.addRemoteConnection(
                            {
                                target_mid  : params['like_mid'],
                                owner_mid   : my_moment.mid,
                                type        : 'like',
                                channel     : channel_id,
                                auth_key    : target_auth_key
                            },
                            function( err, my_moment ){});
                    });
            }
            else
            {
                MOMENT.addRemoteRelation( params['like_mid'], my_moment.mid, function(){} );
                console.log( 'not found' );
            }

            next( err, my_moment );
        });
}

