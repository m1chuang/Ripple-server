var MOMENT = require('../model/momentModel');
var EXPLORE = require('../model/exploreModel');
var DEVICE = require('../model/deviceModel');
var S3 = require('../controller/s3_uploader');
var PUBNUB = require('../controller/pubnub');

var CHALK =  require('chalk');
var async = require('async');
var time = require('moment');
var uuid = require('node-uuid');



exports.init = function( params, next )
{
    console.log( CHALK.red('In MOMENT.init') );
    DEVICE.findOne( { device_id: params['device_id'] },
        function( err, device )
        {
            if( !device )
            {
                console.error( device );
                return cb( err, device )
            }
            else
            {
                var moment_id = uuid.v4();

                PUBNUB.subscribe_server( moment_id, req, res,
                    function( message )
                    {
                        console.log( message );
                    }
                );

                S3.upload( params['image'], { key:moment_id } );

                var moment = new MOMENT(
                {
                    mid :           moment_id,
                    image_url :     'https://s3-us-west-2.amazonaws.com/glimpsing/'+moment_id,
                    complete :      false,
                    date :          time(),
                    status :        '',
                    location :      [params['lat'], params['lon']]
                });

                device.moments.set( 0, moment );

                device.save(
                    function( err, device )
                    {
                        next( err,device )
                    }
                );
            }
        }
    );
}

exports.login = function( params, next )
{
    console.log( CHALK.red('In MOMENT.login') );

    DEVICE.findOne( { device_id: params['device_id'] },
        function(err,device)
        {
            if( !device )
            {
                console.error( device );
                next( err, device );
            }
            else
            {
                var moment = device.moments[0];
                moment.status = params['status'];
                moment.complete = true;

                device.save(
                    function( err, device )
                    {
                        //console.log(CHALK.blue('login save moment to device'));
                        //console.log(device);
                        MOMENT.create( [device.moments[0]],
                            function( err )
                            {
                                next( err, device );
                            });

                    }
                );

            }
        }
    );
}


exports.near = function( device, params, next )
{
    console.log( CHALK.red('In MOMENT.near'));
    console.log( device);
    var my_moment = device.moments[0];

    MOMENT.find(
    {
        location :
        {
            $near : my_moment.location,
            $maxDistance : 50
        }
    })
    .skip( params['offset'] )
    .limit( params['limit'] )
    .exec(
        function ( err, nearby_moments )
        {
            console.log( CHALK.blue('Near by moments') );
            async.map( nearby_moments, AsyncMomentFactory.generate_explore.bind( AsyncMomentFactory ),
                function( err, explore_list )
                {
                    //console.log(CHALK.blue('Explore list: '));
                    //console.log(explore_list);
                    my_moment.explore = explore_list;
                    MOMENT.update( { mid : my_moment.mid },
                        {
                            explore : explore_list
                        }
                    ).exec(
                        function()
                        {
                            //console.log(CHALK.blue('Explore list inserted to moment'));
                            //console.log(device);
                            next( err, device );
                        }
                    );

                }
            );

        }
    );

}
/*
exports.like = function(params, res, next)
{
    next(null, 'You not liked');
}
*/
exports.like = function( params, next )
{
    console.log( CHALK.red( 'In MOMENT.like' ) );

    DEVICE.findOne( { device_id: params['device_id'] },
        function( err, device )
        {
            MomentAction.like( params['like_mid'], device.moments[0].mid,
                function( my_moment )
                {
                    MomentAction.checkMatch( params['like_mid'], my_moment,
                        function( im_liked )
                        {
                            if( im_liked )
                            {
                                MomentAction.create_channel( my_moment )
                            }
                        }
                    );
                }
            );
        }
    );

}

var MomentAction =
{
    like : function( target_mid, my_mid, next )
    {
        MOMENT.findOne( {mid:my_mid},
            function( err, my_moment )
            {
                console.log( my_moment.explore[0] );
                var target_in_me = my_moment.explore.id( target_mid );
                target_in_me.like = true;

                MOMENT.findOne( {mid:target_mid},
                    function(err, target)
                    {
                        var me_in_target = target.explore.id( my_mid );

                        if( me_in_target.like )
                        {
                            create_channel( me_in_target, target_in_me,
                                function( err, chat_channel )
                                {
                                    next( null, chat_channel );
                                }
                            );
                        }
                        else
                        {
                            next( null, null );
                        }

                    }
                );

            }
        );
    },


}

var create_channel = function( me_in_target, target_in_me )
    {

        var chat_channel_id = uuid.v4();
        me_in_target.connect = true;
        me_in_target.chat_channel = chat_channel_id;

        target_in_me.connect = true;
        target_in_me.chat_channel = chat_channel_id;

        me_in_target.save(
            function( err, target )
            {
                target_in_me.save(
                    function( err, target_in_me )
                    {
                        next( null, target_in_me.chat_channel );
                    }
                );
            }
        );
    }

var AsyncMomentFactory =
{
    generate_explore : function( item, next )
    {
        var explore_item = new EXPLORE(
        {
            mid : item.mid,
            image_url: item.image_url,
            status: item.status,
            like : false,
        });
        next( null, explore_item );
    },
};