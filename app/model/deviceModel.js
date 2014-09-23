
var mongoose        = require('mongoose');
var MOMENT    = require(__dirname +'/momentModel');

var Schema          = mongoose.Schema;

var DeviceSchema   = new Schema(
    {
        device_id: String,
        token: String,
        server_channel: String,
        moments: [MOMENT.schema],
        friends: [{device_id:String, friend_channel_id:String}]

    });


DeviceSchema.methods.getCurrentMoment = function(next)
{
    return this.moments[0]
}
//DeviceSchema.index({'moments.location': '2d'});
DeviceSchema.index({'moments.mid':1});

DeviceSchema.index({'moments.mid':1, 'moments.explore.mid':1});
DeviceSchema.index({'device_id':1});


module.exports = mongoose.model('Device', DeviceSchema);

