var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var exploreSchema = new Schema(
{
    mid : String,
    image_url: String,
    location : { type: [Number], index: '2d'},
    status: String,
    distance: String,
    like : false,
    connect : false,
})

