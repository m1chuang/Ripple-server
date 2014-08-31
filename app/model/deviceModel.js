
var mongoose        = require('mongoose');
var Moment    = require(__dirname +'/momentModel');
var Schema          = mongoose.Schema;

var DeviceSchema   = new Schema({
    device_id: String,
    token: String,
    moments: [Moment.schema],
    friends: [Moment.schema]

});


module.exports = mongoose.model('Device', DeviceSchema);

