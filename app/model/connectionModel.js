var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var connectionSchema = new Schema(
{

    target_mid : String,
    channel_id : String,
    type : String

})

