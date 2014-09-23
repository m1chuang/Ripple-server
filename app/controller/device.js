var Device     = require('../model/deviceModel');
var Moment = require('../model/momentModel');

exports.findOrCreate = function( params, next )
{
        //Get device, create one if device does not exist
        Device.findOne( { device_id: params['device_id'] },
            function( err, device )
            {
                if ( !device )
                {
                    //var server_channel_id = uuid.v4();
                    var server_auth_key = uuid.v4();

                    var device = new Device(
                        {
                            device_id: params['device_id'],
                            //server_channel is device id
                            //server_channel : server_channel_id,
                            server_auth_key : server_auth_key
                        });

                    PUBNUB.createServerConnection( params['device_id'],
                        function()
                        {
                            device.save(
                                function( err, device )
                                {
                                    next( err, device )
                                });
                        });
                }
                else
                {
                    next( err, device )
                }
            });
}

