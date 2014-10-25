var mongoose        = require('mongoose');
var MOMENT    = require('../moment/moModel');
var LOG = require('../service/logger');

var Schema          = mongoose.Schema;

var DeviceSchema   = new Schema(
    {
        device_id: String,
        client_auth_key: String,//use current moment id for now
        moments: [MOMENT.schema],
        friends: [
                    {
                        device_id:String,
                        channel_id:String,
                        nick_name:String,
                        auth_key:String
                    }]
    });

DeviceSchema.statics.getDevice = function( req, res, next)
{
    LOG.info('in get d');
    LOG.info(req['auth_token']);
    LOG.info(req['auth_token']['device_id']);
    mongoose.model('Device').findOne(
        {
           'device_id' : req['auth_token']['device_id'],
        },
        function onFind( err, device )
        {
            console.log(device);
            LOG.info(err);
            req['resource_device'] = device;
            next();
        });
}



DeviceSchema.methods.getCurrentMoment = function(next)
{
    return this.moments[0]
}

DeviceSchema.statics.saveFriend = function( did, frdObj )
{
    mongoose.model('Device').findOne(
        {
           'device_id' : did,
        },
        function onFind( err, device )
        {
            console.log('found');
            device.update(
                {
                    $addToSet :
                    {
                        friends : frdObj
                    }
                },
                function onUpdate( err, obj )
                {

                });
        });
}






DeviceSchema.index({'moments.mid':1});
DeviceSchema.index({'moments.mid':1, 'moments.explore.mid':1});
DeviceSchema.index({'device_id':1});


module.exports = mongoose.model('Device', DeviceSchema);

