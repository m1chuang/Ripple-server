var Moment = require('../model/momentModel');
var Device = require('../model/deviceModel');
var uploader = require('../controller/s3_uploader');
var pubnub = require('../controller/pubnub');
var time = require('moment');
var uuid = require('node-uuid');

exports.init = function(req, res, cb) {

    Device.findOne({ device_id: req.body.device_id },function(err,device) {
        if (!device){
            console.error(device);
            return cb(err,device)
        }else{

            var moment_id = uuid.v4();

            pubnub.subscribe_server(moment_id, req, res,function(message) {
                console.log(message);
            });
            uploader.upload(req.body.image,{key:moment_id});

            var moment = new Moment({
                mid: moment_id,
                image_url:"https://s3-us-west-2.amazonaws.com/glimpsing/"+moment_id,
                complete: false,
                date:time(),
                location: [req.body.lat, req.body.lon]
            })
            console.log(moment);
            device.moments.set(0,moment);
            device.save(function(err, device) {
                    return cb(err,device)
            });
        }
    });
}

exports.login = function(req, res, cb) {

    //post moment init image upload url
    Device.findOne({ device_id: req.body.device_id },function(err,device) {
        if (!device){
            console.error(device);
            return cb(err,device)
        }else{
            var moment = device.moments[0]
            moment.status = req.body.status
            moment.complete = true
            device.save(function(err, device) {
                    return cb(err,device.moments[0])
            });

        }
    });
}

exports.near = function(moment,req, res, cb) {

    Moment.find({
        location : {
            $near : moment.location,
            $maxDistance : 50
        }})
    .skip(req.body.offset)
    .limit(req.body.limit)
    .exec(
        function (err, moment) {
            return cb(err, moment)
        }
    );

}

exports.like = function(req, res, cb){


}

