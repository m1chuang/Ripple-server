var Device     = require('../model/deviceModel');
var Moment = require('../model/momentModel');

exports.findOrCreate = function(req, res, cb) {
        //Get device, create one if device does not exist
        Device.findOne({ device_id: req.body.device_id },function(err,device) {
            if (!device){
                var device = new Device({
                    device_id : req.body.device_id
                });

                device.save(function(err, device) {
                    return cb(err,device)
                });
            }else{
                return cb(err,device)
            }
        });

    }

