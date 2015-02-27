"use strict";

var CHALK = require("chalk");
var uuid = require("node-uuid");
var nconf = require("nconf");
var LOG = require("./util").logger;;
var PUBNUB = require("pubnub").init({
    subscribe_key: "demo", //nconf.get('pubnub:subscribe_key'),
    publish_key: "demo", //nconf.get('pubnub:publish_key'),
    secret_key: nconf.get("pubnub:secret_key"),
    auth_key: nconf.get("server-master-key"),
    origin: "pubsub.pubnub.com",
    ssl: true });

var server_master_key = nconf.get("server-master-key");

var pnMessage = {
    like: function like(params) {
        return {

            type: "update",
            code: params.code,
            explore_id: params.explore_id,
            chat_channel_id: params.chat_channel_id };
    },
    update: function update(params) {
        return {

            type: "update",
            code: params.code,
            explore_id: params.explore_id,
            chat_channel_id: params.chat_channel_id };
    },
    subscription: function subscription(params) {
        return {
            type: "001",
            uuid: params.uuid || "",
            image_url: params.image_url || "",
            status: params.status || "" };
    }

};

/*
*   Notify a client
*/
exports.notifyRemote = function (params) {
    LOG.info(pnMessage[params.type](params));
    PUBNUB.publish({
        channel: params.server_channel_id,
        //auth_key  : server_master_key,
        message: pnMessage[params.type](params),
        callback: function callback(e) {
            LOG.info("SUCCESS!", e);
        },
        error: function error(e) {
            LOG.info("FAILED! RETRY PUBLISH!", e);
        }
    });
};

exports.createServerConnection = function (device_id, server_auth_key, next) {
    var client_auth_key = server_auth_key;
    /*
    PUBNUB.grant(
        {
            channel     : device_id,
            auth_key    : client_auth_key,
            read        : true,
            callback    : function(e) { LOG.info( 'SUCCESS!', e ); },
            error       : function(e) { LOG.info( 'FAILED! RETRY PUBLISH!', e ); }
        });
    */
    /*
        PUBNUB.grant(
            {
                channel     : device_id,
                //auth_key    : server_master_key,
                read        : true,
                write       : true,
                callback    : function(e) { LOG.info( 'SUCCESS!', e ); },
                error       : function(e) { LOG.info( 'FAILED! RETRY PUBLISH!', e ); }
            });
    */
    next(client_auth_key);
};

exports.createConversation = function (initator_auth_key, target_auth_key, next) {
    var channel_id = uuid.v4();

    PUBNUB.grant({
        channel: channel_id,
        auth_key: initator_auth_key,
        read: true,
        write: true,
        callback: function callback(e) {
            LOG.info("SUCCESS!", e);
        },
        error: function error(e) {
            LOG.info("FAILED! RETRY PUBLISH!", e);
        }
    });

    PUBNUB.grant({
        channel: channel_id,
        auth_key: target_auth_key,
        read: true,
        write: true,
        callback: function callback(e) {
            LOG.info("SUCCESS!", e);
        },
        error: function error(e) {
            LOG.info("FAILED! RETRY PUBLISH!", e);
        }
    });

    next(channel_id);
};

var psAction = {
    subTest: function subTest(channel, message, cb) {
        /* ---------------------------------------------------------------------------
        Listen for Messages
        --------------------------------------------------------------------------- */
        LOG.info(" heree " + channel);
        var delivery_count = 0;
        var err_count = 0;
        PUBNUB.subscribe({
            channel: channel,
            connect: function connect() {

                LOG.info("connected");

                // Publish a Message on Connect
                PUBNUB.publish({

                    channel: channel,
                    auth_key: "key",
                    message: {
                        count: ++delivery_count,
                        some_key: "Hello World!",
                        message: message
                    },
                    error: function error(info) {
                        LOG.info(info);
                    },
                    callback: function callback(info) {
                        if (!info[0]) LOG.info("Failed Message Delivery");

                        LOG.info(info);

                        PUBNUB.history({
                            channel: channel,
                            limit: 1,
                            callback: function callback(messages) {
                                // messages is an array of history.
                                LOG.info(messages);
                            }
                        });
                    }
                });
            },
            callback: function callback(message) {
                LOG.info(message);
                LOG.info("MESSAGE RECEIVED!!!");
            },
            error: function error() {
                err_count += 1;
                LOG.info("PUBNUB Connection Dropped");
            }
        });
        cb();
    }
};

exports.subTest = function (channel_id, message, cb) {
    psAction.subTest(channel_id, message, cb);
};

exports.subscribe_server = function (params, cb) {
    LOG.info(CHALK.blue("Subscribing to server: " + params.mid));
    PUBNUB.publish({
        channel: params.mid,
        message: { message: "Hello" },
        callback: function callback(m) {
            LOG.info("SUCCESS!", m);
        },
        error: function error(e) {
            LOG.info("FAILED! RETRY PUBLISH!", e);
        }
    });
};
exports.grant = function (channel, cb) {

    PUBNUB.grant({
        channel: channel,
        auth_key: "nope",
        read: true,
        write: true,
        ttl: 300,
        callback: function callback(m) {
            cb("SUCCESS!", m);
        },
        error: function error(e) {
            cb("FAILED! RETRY PUBLISH!" + e);
        }
    });
};

exports.fivefrds = function (channel, next) {

    var deny1 = channel + "_" + "d1";
    var deny2 = channel + "_" + "d2";
    var allow1 = channel + "_" + "a1";
    var allow2 = channel + "_" + "a2";
    var allow3 = channel + "_" + "a3";
    console.log(channel);

    PUBNUB.grant({
        channel: deny1,
        auth_key: "nope",
        read: true,
        write: true,
        ttl: 3000,
        callback: function callback(m) {
            LOG.info("SUCCESS!", m);
        },
        error: function error(e) {
            LOG.info("FAILED! RETRY PUBLISH!" + e);
        }
    });
    PUBNUB.grant({
        channel: allow1,
        auth_key: "key",
        read: true,
        write: true,
        ttl: 3000,
        callback: function callback(m) {
            LOG.info("SUCCESS!", m);
        },
        error: function error(e) {
            LOG.info("FAILED! RETRY PUBLISH!" + e);
        }
    });
    PUBNUB.grant({
        channel: deny2,
        auth_key: "nope",
        read: true,
        write: true,
        ttl: 3000,
        callback: function callback(m) {
            LOG.info("SUCCESS!", m);
        },
        error: function error(e) {
            LOG.info("FAILED! RETRY PUBLISH!" + e);
        }
    });
    PUBNUB.grant({
        channel: allow2,
        auth_key: "key",
        read: true,
        write: true,
        ttl: 3000,
        callback: function callback(m) {
            LOG.info("SUCCESS!", m);
        },
        error: function error(e) {
            LOG.info("FAILED! RETRY PUBLISH!" + e);
        }
    });
    PUBNUB.grant({
        channel: allow3,
        auth_key: "key",
        read: true,
        write: true,
        ttl: 3000,
        callback: function callback(m) {
            LOG.info("SUCCESS!", m);
        },
        error: function error(e) {
            LOG.info("FAILED! RETRY PUBLISH!" + e);
        }
    });
    next("key", deny1, deny2, allow1, allow2, allow3);
};
exports.group = function (params, next) {

    var auth_key = uuid.v4();
    var allow = uuid.v4();
    var deny = uuid.v4();
    for (var i = 0; i < 10; i++) {
        console.log(i);
        var name = "grouptest-" + i;
        console.log(name);
        PUBNUB.grant({
            channel: name,
            auth_key: "nope",
            read: i == 3 || i == 4 ? false : true,
            write: true,
            ttl: 3000,
            callback: function callback(m) {
                LOG.info("SUCCESS! ", m);
            },
            error: function error(e) {
                LOG.info("FAILED! RETRY PUBLISH!" + e);
            }
        });
    }

    next(auth_key, allow, deny);
};
exports.pub = function (channel, message, cb) {
    LOG.info(" heree");
    LOG.info(CHALK.blue("pub to server: " + channel));

    PUBNUB.publish({
        channel: channel,
        message: { message: "Hello from glimpse server~~~" },
        callback: function callback(e) {
            LOG.info("SUCCESS!", e);cb();
        },
        error: function error(e) {
            LOG.info("FAILED! RETRY PUBLISH!", e);
        }
    });
};
//# sourceMappingURL=pubnub.js.map