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
        moments:[{
            image_url:String,
            status:String,
            timestamp: { type: Date, default: Date.now },
        }],
        timestamp: { type: Date, default: Date.now },
    });

var Subscribes = new Schema(
    {
        channel_id:String,
        nick_name:String,
        moments:[{
            image_url:String,
            status:String,
            timestamp: { type: Date, default: Date.now },
        }],
        timestamp: { type: Date, default: Date.now },
    });

var fansSchema = new Schema(
    {
        channel_id:String,
        timestamp: { type: Date, default: Date.now },
    });

var DeviceSchema   = new Schema(
    {
        device_id: String,
        channel_uuid: String,
        pubnub_key: String,
        moments: [MOMENT.schema],
        friends: [FriendScheme],
        subscribes:[Subscribes],
        fans: [fansSchema],
        timestamp       : { type: Date, default: Date.now }
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
           'device_id' : req.body.auth_token.device_id
        },
        function ( err, device )
            {
                LOG.info('device in get device');
                //LOG.info(typeof device);
                //LOG.info(device );
                //LOG.info(device[0] );

                if(err)
                {
                    res.status(404).json({err:err});
                }else{
                    req.body.resource_device = device;
                    next();
                }

            });
};
DeviceSchema.statics.addSubscriber = function(target_did, own_device_id, nickname){
        mongoose.model('Device').findOne(
        {
           'device_id' : target_did,
        },
        function ( err, device )
        {
            device.update(
                {
                    $addToSet :
                    {
                        fans : {channel_id:own_device_id}
                    }
                });
        });
}
DeviceSchema.statics.notifySubscriber = function(mo){
    console.log('notifySubscriber');
    mongoose.model('Device').find(
    {
        'device_id':mo.device_id
    },{
        'fans':1
    },function(err, fans){
        console.log('notifySubscriber--friends');
        console.log(fans);

    });
}
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
                        moments : friend.moments,
                        timestamp: friend.timestamp,
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

