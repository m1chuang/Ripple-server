var CHALK = require('chalk');
var uuid = require('node-uuid');

var PUBNUB = require('pubnub').init(
    {
        publish_key   : 'pub-c-48e704f7-5aab-47c1-8794-190690c0bbc9',
        subscribe_key : 'sub-c-b1d55136-3a12-11e4-949a-02ee2ddab7fe',
        secret_key    : 'sec-c-MGZlNTIyN2QtMGUwNy00Mjg0LTk0MDUtMTA0MzA0ZmQzZDk2',
        origin        : 'gtest.pubnub.com',
        ssl           : true,
    });

var server_master_key = 'MGZlNTIyN2QtMGUwNy00Mjg0LTMzA0ZmQzZDk2k0MDUtMTA0'

var pnMessage =
{
    like: function(params)
    {
        return {

            'code'              :   params['type'],
            'target_mid'        :   params['target_mid'],
            'chat_channel_id'   :   params['chat_channel_id'],
            'auth_key'          :   params['auth_key']
        }

    }

}

/*
*   Notify a client
*/
exports.notifyRemote = function( params, next)
{
    console.log('pnMessage');
    console.log(pnMessage[ params['type'] ]);
    PUBNUB.publish(
        {
            channel   : params['channel_id'],
            auth_key  : server_master_key,
            message   : pnMessage[ params['type'] ]( params ),
            callback  : function(e) { console.log( "SUCCESS!", e ); },
            error     : function(e) { console.log( "FAILED! RETRY PUBLISH!", e ); }
        });

     next();
}


exports.createServerConnection = function( device_id, server_auth_key, next )
{
    var client_auth_key = server_auth_key;
    PUBNUB.grant(
        {
            channel     : device_id,
            auth_key    : client_auth_key,
            read        : true,
            callback    : function(e) { console.log( 'SUCCESS!', e ); },
            error       : function(e) { console.log( 'FAILED! RETRY PUBLISH!', e ); }
        });
    PUBNUB.grant(
        {
            channel     : device_id,
            auth_key    : server_master_key,
            read        : true,
            write       : true,
            callback    : function(e) { console.log( 'SUCCESS!', e ); },
            error       : function(e) { console.log( 'FAILED! RETRY PUBLISH!', e ); }
        });
    next(client_auth_key);
}

exports.createConversation = function( next )
{
    var channel_id = uuid.v4();
    var initator_auth_key = uuid.v4();
    var target_auth_key = uuid.v4();

    PUBNUB.grant(
        {
            channel     : channel_id,
            auth_key    : initator_auth_key,
            read        : true,
            write       : true,
            callback    : function(e) { console.log( 'SUCCESS!', e ); },
            error       : function(e) { console.log( 'FAILED! RETRY PUBLISH!', e ); }
        });

    PUBNUB.grant(
        {
            channel     : channel_id,
            auth_key    : target_auth_key,
            read        : true,
            write       : true,
            callback    : function(e) { console.log( 'SUCCESS!', e ); },
            error       : function(e) { console.log( 'FAILED! RETRY PUBLISH!', e ); }
        });

    next(channel_id, initator_auth_key, target_auth_key);

}






















exports.testSubscribe = function( channel, auth_key, cb )
{
        console.log('SUBBING');
        PUBNUB.subscribe({
            channel: channel,
            auth_key: auth_key,
            connect: function(info){
                console.log('connected');
                PUBNUB.publish({channel: channel , message : '777',
                        callback : function(response) {

                        }
                    });
                cb(info);
            },
            callback: function(info){
                console.log(info);
                console.log('MESSAGE RECEIVED!!!');
                PUBNUB.unsubscribe({channel : channel});
                    done();
            },
            error       : function(e) { console.log( 'FAILED! RETRY SUB!', e ); cb();}
        })
}






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
                auth_key : 'test',
                message  : {
                    count    : ++delivery_count,
                    some_key : 'Hello World!',
                    message    : message
                },
                error : function(info){
                    console.log(info);
                },
                callback : function(info){
                    if (!info[0]) console.log('Failed Message Delivery')

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
            console.log('PUBNUB Connection Dropped');
        }
    });
    }
}




exports.subTest = function( channel_id, message, cb )
{
        psAction.subTest( channel_id, message, cb );
}

exports.subscribe_server = function( params, cb )
{
        console.log( CHALK.blue( 'Subscribing to server: '+ params['mid'] ) );
        PUBNUB.publish(
        {
            channel   : params['mid']+'_server',
            message   : { 'message':'Hello' },
            callback  : function(m) { console.log( 'SUCCESS!', m ); },
            error     : function(e) { console.log( 'FAILED! RETRY PUBLISH!', e ); }
        });
}
exports.grant = function( channel, message, cb )
{

        console.log( CHALK.blue( 'granting: '+ channel ) );
        PUBNUB.grant({
           channel : channel,
           auth_key : 'test',
           read    : true,
           callback  : function(e) { console.log( 'SUCCESS!', e ); },
            error     : function(e) { console.log( 'FAILED! RETRY PUBLISH!', e ); }
         });
        PUBNUB.grant({
           channel : channel,
           auth_key : 'test0',
           read    : true,
           write    : true,
           callback  : function(e) { console.log( 'SUCCESS!', e ); },
            error     : function(e) { console.log( 'FAILED! RETRY PUBLISH!', e ); }
         });
}

exports.pub = function( channel, message, cb )
{
        console.log(' heree');
        console.log( CHALK.blue( 'pub to server: '+ channel ) );

        PUBNUB.publish(
        {
            channel   : channel,
            auth_key : 'test0',
            message   : { 'message':'Hello from glimpse server~~~' },
            callback  : function(e) { console.log( 'SUCCESS!', e ); },
            error     : function(e) { console.log( 'FAILED! RETRY PUBLISH!', e ); }
        });
}


