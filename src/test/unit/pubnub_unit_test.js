var uuid = require('node-uuid');
var nconf = require('nconf');

var pubnub = require('pubnub').init(
    {
        origin            : 'pubsub.pubnub.com',
        publish_key     : nconf.get('pubnub:publish_key'),
        subscribe_key   : nconf.get('pubnub:subscribe_key'),
        secret_key      : nconf.get('pubnub:secret_key'),
    });

var pubnub_enc = require('pubnub').init(
    {
        origin            : 'pubsub.pubnub.com',
        publish_key     : nconf.get('pubnub:publish_key'),
        subscribe_key   : nconf.get('pubnub:subscribe_key'),
        secret_key      : nconf.get('pubnub:secret_key'),
    });
var server_master_key = nconf.get('server-master-key');
var assert = require('assert');
function in_list(list,str) {
    for (var x in list) {
        if (list[x] === str) return true;
    }
    return false;
 }
  function in_list_deep(list,str) {
    for (var x in list) {
        if (JSON.stringify(list[x]) === JSON.stringify(str)) return true;
    }
    return false;
 }
var checkChat = function(done, grant_channel, auth_key1, auth_key2)
{
   pubnub_enc.subscribe({
        'channel' : grant_channel,
        'auth_key' : auth_key1,
        connect : function(response) {
            console.log('sub');
            console.log(response);
            pubnub.publish({
                'channel' : grant_channel,
                'auth_key' : auth_key2,
                'message' : 'Test',
                'callback': function(response) {
                    console.log(response);
                    console.log('pub call');
                    assert.deepEqual(response[0],1);
                    assert.ok(true);
                    //done();
                },
                'error'   : function(response) {
                    console.log('err');
                    console.error(response);
                    //assert.deepEqual(response.message, "Forbidden");
                    //in_list_deep(response.payload.channels,grant_channel);
                    assert.ok(false);
                    if(done) done();
                }
            });

        },
        callback : function(response) {
            assert.deepEqual(response,'Test');
            console.log('msg:');
            console.log(response);
            pubnub_enc.unsubscribe({channel : grant_channel});
            if(done) done();
        },
        error : function(response) {
            assert.ok(false);
            console.log(response);
            pubnub_enc.unsubscribe({channel : grant_channel});
            if(done) done();
        }

    })
};

var checkServer = function(done, grant_channel, auth_key)
{
    pubnub.audit({
        channel : grant_channel,
        auth_key : auth_key,
        callback : function(response) {
            //assert.deepEqual(response.auths[auth_key].r,1);
            console.log(response);
            //assert.deepEqual(response.auths[auth_key].w,0);
            pubnub.history({
                'channel'  : grant_channel,
                'auth_key' : auth_key,
                'callback' : function(response) {
                    console.log(response);
                    assert.ok(true)
                    pubnub.publish({
                        'channel' : grant_channel,
                        'auth_key' : auth_key,
                        'message' : 'Test',
                        'callback': function(response) {
                            console.log(response);
                            assert.ok(false);
                            done();
                        },
                        'error'   : function(response) {
                            console.log(response);
                            assert.deepEqual(response.message, "Forbidden");
                            assert.ok(true);
                            in_list_deep(response.payload.channels,grant_channel);

                            pubnub_enc.subscribe({
                                'channel' : grant_channel,
                                'auth_key' : server_master_key,
                                connect : function(response) {
                                    console.log('sub');
                                    console.log(response);
                                    pubnub.publish({
                                        'channel' : grant_channel,
                                        'auth_key' : server_master_key,
                                        'message' : 'Test',
                                        'callback': function(response) {
                                            console.log(response);
                                            console.log('pub call');
                                            assert.deepEqual(response[0],1);
                                            assert.ok(true);
                                            //done();
                                        },
                                        'error'   : function(response) {
                                            console.log('err');
                                            console.log(response);
                                            //assert.deepEqual(response.message, "Forbidden");
                                            //in_list_deep(response.payload.channels,grant_channel);
                                            assert.ok(false);
                                            done();
                                        }
                                    });

                                },
                                callback : function(response) {
                                    assert.deepEqual(response,'Test');
                                    console.log('msg:');
                                    console.log(response);
                                    pubnub_enc.unsubscribe({channel : grant_channel});
                                    done();
                                },
                                error : function(response) {
                                    assert.ok(false);
                                    console.log(response);
                                    pubnub_enc.unsubscribe({channel : grant_channel});
                                    done();
                                }

                            })



                        }
                    });
                },
                'error' : function(response) {
                    console.log(response);
                    assert.ok(false);
                    pubnub.publish({
                        'channel' : grant_channel,
                        'message' : 'Test',
                        'auth_key' : auth_key,
                        'callback': function(response) {
                            assert.ok(false);
                            done();
                        },
                        'error'   : function(response) {
                            assert.deepEqual(response.message, "Forbidden");
                            //in_list_deep(response.payload.channels,grant_channel);
                            assert.ok(true);
                            done();
                        }
                    })
                }

            });

        }
    });
};

var grantReadOnly= function(done, grant_channel, auth_key) {
            var grant_channel_local = grant_channel;
            setTimeout(function() {
                pubnub.grant({
                    channel : grant_channel_local,
                    auth_key : auth_key,
                    read : true,
                    write : false,
                    callback : function(response) {
                        pubnub.audit({
                            channel : grant_channel_local,
                            auth_key : auth_key,
                            callback : function(response) {
                                assert.deepEqual(response.auths.abcd.r,1);
                                assert.deepEqual(response.auths.abcd.w,0);
                                pubnub.history({
                                    'channel'  : grant_channel_local,
                                    'auth_key' : auth_key,
                                    'callback' : function(response) {
                                        assert.ok(true)
                                        pubnub.publish({
                                            'channel' : grant_channel_local,
                                            'auth_key' : auth_key,
                                            'message' : 'Test',
                                            'callback': function(response) {
                                                assert.ok(false);
                                                done();
                                            },
                                            'error'   : function(response) {
                                                assert.deepEqual(response.message, "Forbidden");
                                                in_list_deep(response.payload.channels,grant_channel_local);
                                                assert.ok(true);
                                                done();
                                            }
                                        })
                                    },
                                    'error' : function(response) {
                                        assert.ok(false);
                                        pubnub.publish({
                                            'channel' : grant_channel_local,
                                            'message' : 'Test',
                                            'auth_key' : auth_key,
                                            'callback': function(response) {
                                                assert.ok(false);
                                                done();
                                            },
                                            'error'   : function(response) {
                                                assert.deepEqual(response.message, "Forbidden");
                                                in_list_deep(response.payload.channels,grant_channel_local);
                                                assert.ok(true);
                                                done();
                                            }
                                        })
                                    }

                                });

                            }
                        });

                    }
                })
            },5000);
        }


module.exports = {grantReadOnly:grantReadOnly, checkServer:checkServer, checkChat:checkChat};