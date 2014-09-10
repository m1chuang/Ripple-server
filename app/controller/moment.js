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
    DEVICE.findOne( { device_id: params['my_device_id'] },
        function( err, device )
        {
            if( !device )
            {
                console.error( device );
                next( err, device );
            }
            else
            {
                var moment_id = uuid.v4();
                params['mid']=moment_id;
                /*
                PUBNUB.subscribe_server( params,
                    function( message )
                    {
                        console.log( message );
                    }
                );
*/
                S3.upload( params['image'], { key:moment_id } );
                var moment = new MOMENT(
                {
                     mid :           moment_id,
                     device_id :     params['device_id'],
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

    DEVICE.findOne( { device_id: params['my_device_id'] },
        function(err,device)
        {
            if( !device )
            {
                console.error( device );
                next( err, device );
            }
            else
            {
                var temp_moment = device.moments[0];
                var moment = new MOMENT(
                {
                     mid :           temp_moment.mid,
                     device_id :     temp_moment.device_id,
                     image_url :     temp_moment.image_url,
                     complete :      true,
                     date :          temp_moment.time,
                     status :        params['status'],
                     location :      temp_moment.location
                });

                moment.getNear( params,
                    function(err,obj)
                    {
                        moment.refreshExplore(obj,
                            function(err, explore_list){

                                moment.explore = explore_list;
                                MOMENT.create( moment,
                                    function(err,obj1)
                                    {
                                        next( err, obj1);
                                    }
                                );
                            }
                        );

                    }
                );



            }
        }
    );
}







exports.like = function( params, next )
{


    MOMENT.getRelation( params['like_mid'], params['my_device_id'],
        function(err,obj)
        {
            if( obj.like_relation.length != 0 )
            {
                console.log('found');
                //todo generate channel
                obj.addConnection( 'like', function(){});
                MOMENT.addRemoteConnection(params['like_mid'], obj.mid, 'like', function(){});
                //todo pubnub message

            }
            else
            {
                MOMENT.addRemoteRelation(params['like_mid'], obj.mid, function(){});
                console.log('not found');
            }
            next( err, obj);
        })


}

