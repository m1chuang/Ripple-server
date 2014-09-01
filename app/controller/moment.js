var MOMENT = require('../model/momentModel');
var EXPLORE = require('../model/exploreModel');
var DEVICE = require('../model/deviceModel');
var S3 = require('../controller/s3_uploader');
var PUBNUB = require('../controller/pubnub');

var CHALK =  require('chalk');
var async = require('async');
var time = require('moment');
var uuid = require('node-uuid');

exports.init = function(req, res, next)
{
    console.log(CHALK.red('In MOMENT.init'));
    DEVICE.findOne({ device_id: req.body.device_id },
        function(err,device)
        {
            if (!device)
            {
                console.error(device);
                return cb(err,device)
            }
            else
            {
                var moment_id = uuid.v4();

                PUBNUB.subscribe_server(moment_id, req, res,function(message)
                {
                    console.log(message);
                });

                S3.upload(req.body.image,{key:moment_id});

                var moment = new MOMENT(
                {
                    mid: moment_id,
                    image_url:"https://s3-us-west-2.amazonaws.com/glimpsing/"+moment_id,
                    complete: false,
                    date:time(),
                    location: [req.body.lat, req.body.lon]
                });

                console.log(moment);
                device.moments.set(0,moment);
                device.save(function(err, device)
                {
                    next(err,device)
                });
            }
        }
    );
}

exports.login = function(req, res, next)
{
    console.log(CHALK.red('In MOMENT.login'));
    //post moment init image upload url
    DEVICE.findOne({ device_id: req.body.device_id },
        function(err,device)
        {
            if (!device)
            {
                console.error(device);
                next(err,device);
            }
            else
            {
                var moment = device.moments[0];
                moment.status = req.body.status;
                moment.complete = true;

                device.save(function(err, device)
                {
                    console.log(CHALK.blue('login save device'));
                    console.log(device);

                    MOMENT.create([device.moments[0]],function(err)
                    {
                        next(err,device);
                    });
                });

            }
        }
    );
}


exports.near = function(device,req, res, next)
{
    console.log(CHALK.red('In MOMENT.near'));
    console.log(device);
    var my_moment = device.moments[0];
    MOMENT.find(
    {
        location :
        {
            $near : my_moment.location,
            $maxDistance : 50
        }
    })
    .skip(req.body.offset)
    .limit(req.body.limit)
    .exec(
        function (err, nearby_moments)
        {
            console.log(CHALK.blue('Near by moments'));
            async.map(nearby_moments, AsyncMomentFactory.generate_explore.bind( AsyncMomentFactory ),
                function(err, explore_list)
                {
                    //console.log(CHALK.blue('Explore list: '));
                    //console.log(explore_list);
                    my_moment.explore = explore_list;
                    device.save(
                        function(err, device)
                        {
                            //console.log(CHALK.blue('Explore list inserted to moment'));
                            //console.log(device);
                            next(err, device);
                        }
                    );
                }
            );

        }
    );

}

exports.like = function(req, res, cb)
{

    return cb(err)
}





var AsyncMomentFactory =
{
    generate_explore: function(item, next)
    {
        var explore_item = new EXPLORE(
        {
            visible_id : uuid.v4(),
            mid : item.mid,
            image_url: item.image_url,
            status: item.status,
            like : false,
        });
        next(null, explore_item);
    }
};