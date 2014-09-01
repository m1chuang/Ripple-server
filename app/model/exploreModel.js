var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var exploreSchema = new Schema(
{

    mid : String,
    image_url: String,
    status: String,
    like : false,
    connect : false,
    chat_channel: String
})

module.exports = mongoose.model('Explore', exploreSchema);