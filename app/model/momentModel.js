
var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var MomentSchema   = new Schema({
    mid: String,
    image_url: String,
    status: String,
    complete: Boolean,
    date:  { type: Date, default: Date.now },
    location: { type: [Number], index: '2d'},
    liked
});
MomentSchema.index({location: '2dsphere'});
module.exports = mongoose.model('Moment', MomentSchema);