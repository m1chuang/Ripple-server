var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var relationSchema = new Schema(
{
    target_mid : String,
    type    : String,
    connect : false,
})

