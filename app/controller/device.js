var DEVICE     = require('../model/deviceModel');
var MOMENT = require('../model/momentModel');
var uuid = require('node-uuid');
var PUBNUB = require('../controller/pubnub');

exports.findOrCreate = function( params, next )
{
        //Get device, create one if device does not exist
        DEVICE.findOne( { device_id: params['device_id'] },
            function( err, device )
            {

                if ( !device )
                {
                    console.log('no existing');
                    var server_auth_key = uuid.v4();

                    var device = new Device(
                        {
                            device_id: params['device_id'],
                            //server_channel is device id
                            //server_channel : server_channel_id,
                            server_auth_key : server_auth_key
                        });
                    console.log(device);
                    PUBNUB.createServerConnection( params['device_id'], server_auth_key,
                        function()
                        {
                            device.save(
                                function( err, device )
                                {
                                    next( err, device, 201 );
                                });
                        });
                }
                else
                {
                    console.log('exist');
                    next( err, device, 200 );
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

exports.getFriends = function( params, next )
{
    console.log( CHALK.red('In MOMENT.getFriends') );
    DEVICE.findOne(
        {
            'device_id': params['my_device_id']
        },
        function( err, device )
        {
            if (err) throw err;
            async.filter( device.friends, function(friend)
                {
                    return {
                            nick_name: friend.nick_name,
                            channel_id : friend.channel_id,
                            initator_auth_key:friend.initator_auth_key
                    }
                }, function(results)
                {
                    next( err, results);
                });
        });
};

exports.unFriend = function( params, next )
{
    next();
};