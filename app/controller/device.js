var Device     = require('../model/deviceModel');
var Moment = require('../model/momentModel');
var uuid = require('node-uuid');
var PUBNUB = require('../controller/pubnub');

exports.findOrCreate = function( params, next )
{
        //Get device, create one if device does not exist
        Device.findOne( { device_id: params['device_id'] },
            function( err, device )
            {


                console.log('db search finish');
                console.log(err);
                console.log(device);
                if ( !device )
                {
                    console.log('no existing');
                    //var server_channel_id = uuid.v4();
                    var server_auth_key = uuid.v4();

                    var device = new Device(
                        {
                            device_id: params['device_id'],
                            //server_channel is device id
                            //server_channel : server_channel_id,
                            server_auth_key : server_auth_key
                        });
                    console.log(device);
                    PUBNUB.createServerConnection( params['device_id'], server_auth_key,
                        function()
                        {
                            device.save(
                                function( err, device )
                                {
                                    next( err, device, 201 );
                                });
                        });
                }
                else
                {
                    console.log('exist');
                    next( err, device, 200 );
                }
            });
}

