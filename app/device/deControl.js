var DEVICE     = require('./deModel');
var MOMENT = require('../moment/moModel');
var AUTH     = require('../service/auth');
var uuid = require('node-uuid');
var PUBNUB = require('../service/pubnub');
var LOG = require('../service/logger');
var CHALK =  require('chalk');

exports.createOrRenew = function( req, res, next )
{
    var device_id = uuid.v4();
    var client_auth_key = uuid.v4();
    var new_device = new DEVICE(
        {
            device_id: device_id,
            pubnub_key : client_auth_key,
        });

    PUBNUB.createServerConnection( device_id, client_auth_key,
        function()
        {
            AUTH.newBaseToken( new_device,
                function( device, token )
                {
                    next( '', token, true, device_id, client_auth_key, 201 );
                    new_device.save(function(err){console.log('save device');console.log(err);});
                });
        });
}


exports.getNewExplore = function( params, next )
{
    LOG.info( CHALK.red('In MOMENT.getNewExplore') );

    DEVICE.findOne( { device_id: params['my_device_id'] },
        function onFind(err,device)
        {
            if( !device )
            {
                LOG.info("Device id: '"+params['my_device_id']+"' not found");
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
                        moment.createExplore( params, obj,
                            function saveExploreList( err, explore_list)
                            {
                                moment.explore = explore_list;
                                next( err,explore_list );
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
            if (err) LOG.error(err);
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