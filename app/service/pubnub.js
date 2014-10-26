var CHALK = require('chalk');
var uuid = require('node-uuid');
var nconf = require('nconf');
var PUBNUB = require('pubnub').init(
    {
        subscribe_key   : nconf.get('pubnub:subscribe_key'),
        publish_key     : nconf.get('pubnub:publish_key'),
        secret_key      : nconf.get('pubnub:secret_key'),
        ssl             : true,
    });

var server_master_key = nconf.get('server-master-key');

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

exports.createConversation = function( initator_auth_key, target_auth_key, next)
{
    var channel_id = uuid.v4();

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

        next(channel_id);



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
exports.grant = function( channel, cb )
{

        PUBNUB.grant({
           channel : channel,
           auth_key : 'nope',
           read    : true,
           write    : true,
           ttl      : 300,
           callback  : function(m) { cb(  'SUCCESS!',m ); },
            error     : function(e) { cb( 'FAILED! RETRY PUBLISH!'+ e ); }
         });

}


exports.twofrds = function( channel, next )
{

    var auth_key = uuid.v4();
    var allow = uuid.v4();
    var deny = uuid.v4();
        PUBNUB.grant({
           channel : deny,
           auth_key : 'nope',
           read    : true,
           write    : true,
           ttl      : 3000,
           callback  : function(m) { console.log(  'SUCCESS!',m ); },
            error     : function(e) { console.log( 'FAILED! RETRY PUBLISH!'+ e ); }
         });
        PUBNUB.grant({
           channel : allow,
           auth_key : auth_key,
           read    : true,
           write    : true,
           ttl      : 3000,
           callback  : function(m) { console.log(  'SUCCESS!',m ); },
            error     : function(e) { console.log( 'FAILED! RETRY PUBLISH!'+ e ); }
         });
        next(auth_key, allow, deny);
}

exports.pub = function( channel, message, cb )
{
        console.log(' heree');
        console.log( CHALK.blue( 'pub to server: '+ channel ) );

        PUBNUB.publish(
        {
            channel   : channel,
            auth_key : 'null',
            message   : { 'message':'Hello from glimpse server~~~' },
            callback  : function(e) { console.log( 'SUCCESS!', e ); },
            error     : function(e) { console.log( 'FAILED! RETRY PUBLISH!', e ); }
        });
}


