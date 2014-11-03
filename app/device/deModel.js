var mongoose        = require('mongoose');
var async = require('async');
var MOMENT    = require('../moment/moModel');
var LOG = require('../service/util').logger;;

var Schema          = mongoose.Schema;
var FriendScheme = new Schema(
    {
        device_id:String,
        channel_id:String,
        nick_name:String,
        moments:[MOMENT.schema]
    });
var DeviceSchema   = new Schema(
    {
        device_id: String,
        pubnub_key: String,
        moments: [MOMENT.schema],
        friends: [FriendScheme]
    });
/*
* Middleware
*/
DeviceSchema.statics.getDevice = function( req, res, next)
{
    LOG.info('[ Middleware ] getDevice');
    LOG.info(req.body.auth_token);
    LOG.info(req.body.auth_token.device_id);

    mongoose.model('Device').findOne(
        {
           'device_id' : req.body.auth_token.device_id,
        },
        function ( err, device )
            {
                LOG.info('device in get device');
                //LOG.info(typeof device);
                //LOG.info(device );
                //LOG.info(device[0] );
               // LOG.info(err);
                if(err)
                {
                    res.status(404).json({err:err});
                }else{
                    req.body.resource_device = device;
                    next();
                }

            });
};

DeviceSchema.statics.saveFriend = function( did, frdObj )
{
    mongoose.model('Device').findOne(
        {
           'device_id' : did,
        },
        function ( err, device )
        {
            device.update(
                {
                    $addToSet :
                    {
                        friends : frdObj
                    }
                });
        });
};

DeviceSchema.statics.filterFriends = function(device, next)
{
    async.filter(device.friends, function(friend)
            {
                return (friend)?{}: {
                        nick_name: friend.nick_name,
                        channel_id : friend.channel_id,
                        moments : friend.moments
                    }
            },
            function(friend_list)
            {

                next();
            });
};

DeviceSchema.methods.getCurrentMoment = function(next)
{
    return this.moments[0];
};


DeviceSchema.index({'moments.mid':1});
DeviceSchema.index({'moments.mid':1, 'moments.explore.mid':1});
DeviceSchema.index({'device_id':1});


module.exports = mongoose.model('Device', DeviceSchema);

