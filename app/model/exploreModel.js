var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var exploreSchema = new Schema({
    visible_id : String,
    mid : String,
    image_url: String,
    status: String,
    like : false,
})

module.exports = mongoose.model('Explore', exploreSchema);