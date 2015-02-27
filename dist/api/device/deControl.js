"use strict";

var mongoose = require("mongoose");
var DEVICE = require("./deModel");
var MOMENT = require("../moment/moModel");
var AUTH = require("../service/auth");
var uuid = require("node-uuid");
var PUBNUB = require("../service/pubnub");
var LOG = require("../service/util").logger;;
var CHALK = require("chalk");

exports.register = function (params, res, next) {
    var device_id = uuid.v4();
    var pubnub_auth_key = uuid.v4();
    var channel_uuid = uuid.v4();

    var new_device = new DEVICE({
        device_id: device_id,
        pubnub_key: pubnub_auth_key,
        channel_uuid: channel_uuid
    });
    new_device.save();
    PUBNUB.createServerConnection(channel_uuid, pubnub_auth_key, function () {
        var token = {
            device_id: device_id };

        AUTH.newAuthToken(token, true, function (newToken) {
            next(newToken, true, device_id, /*channel_uuid*/pubnub_auth_key, [], 201);
        });
    });
};

exports.login = function (params, res, next) {
    LOG.info(params);
    mongoose.model("Device").findOne({
        device_id: params.auth_token.device_id }, function (err, device) {
        LOG.info("in login");
        LOG.info(device);
        LOG.info(params);
        if (err || device === null) {
            res.status(404).json({ err: err });
        } else {
            MOMENT.isExpired(params.auth_token, function (status) {
                AUTH.newAuthToken(params.auth_token, status, function (newToken) {
                    next(newToken, status, device.channel_uuid, device.pubnub_key, device.friends, 200);
                });
            });
        }
    });
};

exports.getFriends = function (params, next) {
    LOG.info(CHALK.red("In DEVICE.getFriends"));
    DEVICE.filterFriends(device, function (friends) {
        next(err, friends);
    });
};

exports.unFriend = function (params, next) {
    next();
};
//# sourceMappingURL=deControl.js.map