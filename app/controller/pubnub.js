var CHALK = require('chalk');

var PUBNUB = require('pubnub').init(
{
    publish_key   : 'demo',//pub-c-48e704f7-5aab-47c1-8794-190690c0bbc9',//pub-c-afb09cf5-004d-43c6-9074-8bcd52c4e331',
    subscribe_key : 'demo',//sub-c-b1d55136-3a12-11e4-949a-02ee2ddab7fe',//sub-c-1a87db14-0b0a-11e4-9922-02ee2ddab7fe',
    secret_key    : '',//sec-c-MGZlNTIyN2QtMGUwNy00Mjg0LTk0MDUtMTA0MzA0ZmQzZDk2',//sec-c-YWY2ZjQyOTgtMjEzNy00YjdmLWIzMzMtZGZiOWQ3MDc0M2Vj',
    origin : 'pubsub.pubnub.com',//gtest.pubnub.com',
    ssl           : true,

});

var psAction =
{
    subTest : function(channel, message, cb )
    {
    /* ---------------------------------------------------------------------------
    Listen for Messages
    --------------------------------------------------------------------------- */
    console.log(' heree '+channel);
    var delivery_count = 0;
    PUBNUB.subscribe({
        channel  : channel,
        connect  : function() {

            console.log('connected');

            // Publish a Message on Connect
            PUBNUB.publish({
                channel  : channel,
                message  : {
                    count    : ++delivery_count,
                    some_key : "Hello World!",
                    message    : message
                },
                error : function(info){
                    console.log(info);
                },
                callback : function(info){
                    if (!info[0]) console.log("Failed Message Delivery")

                    console.log(info);

                    PUBNUB.history({
                        channel  : channel,
                        limit    : 1,
                        callback : function(messages){
                            // messages is an array of history.
                            console.log(messages);
                        }
                    });
                }
            });
        },
        callback : function(message) {
            console.log(message);
            console.log('MESSAGE RECEIVED!!!');
        },
        error    : function() {
            console.log("PUBNUB Connection Dropped");
        }
    });
    }
}


exports.subscribe_server= function( params, cb )
{
        console.log( CHALK.blue( 'Subscribing to server: '+ params['mid'] ) );
        PUBNUB.publish(
        {
            channel   : params['mid']+'_server',
            message   : { 'message':'Hello' },
            callback  : function(e) { console.log( "SUCCESS!", e ); },
            error     : function(e) { console.log( "FAILED! RETRY PUBLISH!", e ); }
        });
}

exports.createConnection = function( type, next )
{
    var channel_id = uuid.v4();
    psAction.subTest(channel_id, '');
    next(channel_id);

}

exports.grant= function( channel, message, cb )
{
        console.log(' heree');
        console.log( CHALK.blue( 'Subscribing to server: '+ channel ) );
        PUBNUB.grant({
           channel : channel,
           read    : true,
           write   :true,
           auth_key : 'test',
           callback  : function(e) { console.log( "SUCCESS!", e ); },
            error     : function(e) { console.log( "FAILED! RETRY PUBLISH!", e ); }
         });

}

exports.pub = function( channel, message, cb )
{
        console.log(' heree');
        console.log( CHALK.blue( 'pub to server: '+ channel ) );

        PUBNUB.publish(
        {
            channel   : channel,
            message   : { 'message':'Hello from glimpse server' },
            callback  : function(e) { console.log( "SUCCESS!", e ); },
            error     : function(e) { console.log( "FAILED! RETRY PUBLISH!", e ); }
        });
}


