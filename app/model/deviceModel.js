
var mongoose        = require('mongoose');
var MOMENT    = require(__dirname +'/momentModel');
var Schema          = mongoose.Schema;

var DeviceSchema   = new Schema(
{
    device_id: String,
    token: String,
    moments: [MOMENT.schema],
    friends: [{device_id:String, friend_channel_id:String}]

});


module.exports = mongoose.model('Device', DeviceSchema);

