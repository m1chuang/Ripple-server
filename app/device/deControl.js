var DEVICE     = require('./deModel');
var MOMENT = require('../moment/moModel');
var AUTH     = require('../service/auth');
var uuid = require('node-uuid');
var PUBNUB = require('../service/pubnub');
var LOG = require('../service/util').logger;;
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
                    new_device.save(function(err){LOG.info('save device');});
                });
        });
};



exports.getFriends = function( params, next )
{
    LOG.info( CHALK.red('In DEVICE.getFriends') );
    DEVICE.filterFriends( device, function(friends)
        {
            next( err, friends);
        });
};

exports.unFriend = function( params, next )
{
    next();
};