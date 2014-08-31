var CHALK = require('chalk');
var PUBNUB = require('pubnub').init({
    publish_key   : 'demo',//pub-c-afb09cf5-004d-43c6-9074-8bcd52c4e331',
    subscribe_key : 'demo',//'sub-c-1a87db14-0b0a-11e4-9922-02ee2ddab7fe',
    //secret_key    : 'sec-c-YWY2ZjQyOTgtMjEzNy00YjdmLWIzMzMtZGZiOWQ3MDc0M2Vj',
    origin : 'pubsub.pubnub.com',
    uuid: 'glimpse_server',
});


exports.subscribe_server= function(moment_id, req, res, cb) {

        console.log(CHALK.blue('Subscribing to server: '+ moment_id));
        PUBNUB.publish({
            channel   : moment_id+'_server',
            message   : {'message':'Hello'},
            callback  : function(e) { console.log( "SUCCESS!", e );},
            error     : function(e) { console.log( "FAILED! RETRY PUBLISH!", e ); }
        });
}
