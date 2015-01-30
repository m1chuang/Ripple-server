"use strict";

var mongoose = require("mongoose");
var async = require("async");
var MOMENT = require("./moment/moModel");
var DEVICE = require("./device/deModel");
var MomentCtr = require("./moment/moControl");
var LOG = require("./service/util").logger;;
var uuid = require("node-uuid");
var Schema = mongoose.Schema;



var connectionSchema = new Schema({
    actor_id: String,
    device_id: String,
    channel_id: String,
    type: String
});

var relationSchema = new Schema({
    actor_id: String,
    pubnub_key: String,
    type: String,
    status: Number });

var exploreSchema = new Schema({
    action_token: {
        like: String,
        subscribe: String
    },
    actor_id: String,
    image_url: String,
    status: String,
    distance: String });

var ActorSchema = new Schema({
    actor_id: String,
    health: String,
    device_id: String,
    pubnub_key: String,
    image_url: String,
    status: String,
    relation: [relationSchema],
    explore: [exploreSchema],
    connection: [connectionSchema],
    timestamp: { type: Date, "default": Date.now }
});
/*
* Middleware
*/
ActorSchema.statics.getActor = function (req, res, next) {
    LOG.info("[ Middleware ] getActor");

    LOG.info(req.body.auth_token.device_id);

    mongoose.model("Actor").findOne({
        actor_id: req.body.auth_token.actor_id }, function (err, actor) {
        LOG.info(err);
        LOG.info("actor");
        console.log(actor);
        if (err || actor === null) {
            res.status(404).json({ err: err });
        } else {
            req.body.resource_actor = actor;
            next();
        }
    });
};
ActorSchema.statics.getConnection = function (target_aid, owner_aid, next) {
    LOG.info("target_aid");
    LOG.info(target_aid);

    mongoose.model("Actor").find({
        actor_id: owner_aid }, {
        connection: 1
    }).sort({ timestamp: -1 }).limit(1).exec(function (err, obj) {
        if (err) LOG.error(err);

        next(err, obj);
    });
};
ActorSchema.statics.getRelation = function (target_aid, owner_aid, next) {
    LOG.info("target_aid");
    LOG.info(target_aid);

    mongoose.model("Actor").find({
        actor_id: owner_aid }, {
        relation: {
            $elemMatch: {
                actor_id: target_aid }

        },
        connection: {
            $elemMatch: {
                actor_id: target_aid }
        },
        actor_id: 1,
        pubnub_key: 1,
        image_url: 1,
        status: 1,
        health: 1

    }).sort({ timestamp: -1 }).limit(1).exec(function (err, obj) {
        if (err) LOG.error(err);

        next(err, obj);
    });
};


ActorSchema.methods.addRelation = function (params, next) {
    this.update({
        $addToSet: {
            relation: {
                actor_id: params.target_aid,
                status: params.status,
                type: params.type
            }
        }
    }, function onUpdate(err, num, obj) {
        LOG.info("-addconncetion: ");
        LOG.info(obj);
        LOG.info(err);
        LOG.info(num);
        if (next) next(err, num, obj);
    });
};

ActorSchema.methods.saveConnection = function (params, next) {
    var self = this;
    this.update({
        $addToSet: {
            connection: {
                actor_id: params.target_aid,
                device_id: params.target_device_id,
                channel_id: params.channel_id,
                type: "friend"
            }
        }

    }, function onUpdate(err, num, obj) {
        LOG.info("-chcaddconncetion: ");
        console.log(self);
        LOG.info(err);

        mongoose.model("Device").update({
            device_id: params.target_device_id
        }, {
            $addToSet: {
                friends: {
                    device_id: self.device_id,
                    channel_id: params.channel_id,
                    nick_name: "",
                    moments: [{
                        image_url: self.image_url,
                        status: self.status
                    }]
                }
            }
        }, function (err, num, obj) {
            if (next) next(err, num, obj);
            LOG.error("#######################################################################");
            LOG.info(err);
            LOG.info(num);
            LOG.info(obj);
        });
    });
};



ActorSchema.statics.saveRemoteConnection = function (params, next) {
    mongoose.model("Actor").findOne({
        actor_id: params.target_aid }, function (err, actor) {
        var device_id = actor.device_id;

        var target_actor = actor;
        actor.update({

            $addToSet: {

                connection: {
                    actor_id: params.owner_aid,
                    device_id: target_actor.device_id,
                    channel_id: params.channel_id,
                    type: "friend" }

            },
            device_id: 1
        }, function onUpdate(err, num, obj) {
            LOG.error("#######################################################################");
            LOG.info(err);
            LOG.info(num);
            console.log(params);
            console.log(target_actor);

            mongoose.model("Device").update({
                device_id: params.own_device_id }, {
                $addToSet: {
                    friends: {
                        device_id: target_actor.device_id,
                        channel_id: params.channel_id,
                        nick_name: "",
                        moments: [{
                            image_url: target_actor.image_url,
                            status: target_actor.status
                        }]
                    }
                }
            }, function (err, num, obj) {
                LOG.error("#######################################################################");
                LOG.info(err);
                LOG.info(num);
                LOG.info(obj);
            });
            LOG.info(actor.device_id);
            next(err, actor.device_id);
        });
    });
};

ActorSchema.statics.addRemoteRelation = function (params, next) {
    mongoose.model("Actor").findOne({
        actor_id: params.target_aid
    }, function (err, actor) {
        if (err) LOG.info(err);
        //LOG.info('actor');
        //LOG.info(actor);
        actor.update({
            $addToSet: {
                relation: {
                    actor_id: params.owner_aid,
                    pubnub_key: params.pubnub_key,
                    status: params.status
                }
            }
        }, function onUpdate(err, num, obj) {
            //LOG.info(err);
            if (next) next(err, num, obj);
        });
    });
};


/*
* Helper
*/
var actorModel = mongoose.model("Actor", ActorSchema);
actorModel.createPending = function (params, next) {
    LOG.warn("Actor.createPending, actor.health:" + params.resource_actor);

    MOMENT.getExplore(params, function (err, explore_list) {
        LOG.error("create pending");
        LOG.error(params.auth_token.device_id);
        if (err) throw err;
        DEVICE.findOne({ device_id: params.auth_token.device_id }, function (err, device) {
            var newActor = new actorModel({
                actor_id: params.auth_token.actor_id,
                status: params.status,
                pubnub_key: device.pubnub_key,
                health: "pending",
                explore: explore_list
            });
            next(newActor);
        });

    });
};


module.exports = actorModel;
//connect : false,