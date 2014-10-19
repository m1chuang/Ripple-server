
var mongoose        = require('mongoose');
var MOMENT    = require('../moment/momentModel');

var Schema          = mongoose.Schema;

var DeviceSchema   = new Schema(
    {
        device_id: String,
        token: String,
        server_auth_key: String,
        moments: [MOMENT.schema],
        friends: [
                    {
                        device_id:String,
                        channel_id:String,
                        nick_name:String,
                        auth_key:String
                    }]
    });


DeviceSchema.methods.getCurrentMoment = function(next)
{
    return this.moments[0]
}

DeviceSchema.statics.saveFriend = function( did, frdObj )
{
    this.model( 'Device' ).findOne(
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

