var DeviceCtr     = require('../controller/device');


var express = require('express');
var device = express.Router();

device.route('/')
   /*
    *   Request when APP is open
    */
    .post( function( req, res )
    {
        var params =
        {
            device_id : req.body.device_id
        };

        DeviceCtr.findOrCreate( params,
            function( err, device, status )
            {
                console.log(device);
                res.status(status).json(
                    {
                        server_auth_key: device.server_auth_key
                    });
            });
    });

device.route('/friends')
    .post( function( req, res)
    {
        //@@@ return friend list
        //show unread updates
        var params =
        {
            my_device_id :req.body.device_id,
        };

        DeviceCtr.getFriends( params,
            function( err, friends )
            {
                console.log(friends);
                res.json(
                    {
                        friends: friends
                    });
            });
    });

device.route('/friends/delete')
    .post( function( req, res )
    {
        var params =
        {
            my_device_id : req.body.device_id,
            target_mid :  req.body.target_id
        };
        DeviceCtr.unFriend( params,
            function( err, status )
            {
                res.json(
                    {
                        status: status
                    });
            })

    });

device.route('/friends/add')
    .post( function( req, res )
    {
        var params =
        {
            my_device_id : req.body.device_id,
            target_mid :  req.body.target_id
        };
        //@@@ add friend using alternative methonds, ex QR

    });

device.route('/explore')
    /*
    *   Get update on explore list, etc
        TODO:
            finish getExplore
    */
    .post( function( req, res )
    {
        var params =
        {
            my_device_id :req.body.device_id,
        };

        DeviceCtr.getNewExplore( params,
            function( err, explore_list )
            {
                console.log(explore_list);
                res.json(
                    {
                        explore: explore_list
                    });
            });
    });

device.route('/explore/:page')
    /*
    *   Get pagination on explore list
    */
    .post( function( req, res )
    {
        var params =
        {
            my_device_id :req.body.device_id,
            skip : 10*req.params.page,
            offset : 10
        };

        DeviceCtr.getPageExplore( params,
            function( err, explore_list )
            {
                console.log(explore_list);
                res.json(
                    {
                        explore: explore_list
                    });
            });
    });


module.exports = device