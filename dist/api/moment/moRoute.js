"use strict";

var MomentCtr = require("./moControl");
var DEVICE = require("../device/deModel");
var UTIL = require("../service/util");
var LOG = UTIL.logger;
var routeValidator = require("../service/util").validator.route;
var tokenValidator = require("../service/util").validator.token;
var AUTH = require("../service/auth");
var ACTOR = require("../actor");
var S3 = require("../service/uploader");
var nconf = require("nconf");
var express = require("express");
var uuid = require("node-uuid");


var moment = express.Router();



/**
**  Input Validation & Authentication
**/
moment.post("/", S3.multipart, routeValidator("moment", "post"));
moment.put("/", routeValidator("moment", "put"));
moment.post("/action", routeValidator("moment", "action"));

moment.use(AUTH.authenticate);


/**
**  Routes
**/
moment.route("/")
/*
   Initiate a moment, request when photo taken
*/
.post(DEVICE.getDevice, function (req, res) {
    var params = {
        device_id: req.body.auth_token.device_id,
        resource_device: req.body.resource_device,
        image_url: req.body.image_url,
        lat: req.body.lat,
        lon: req.body.lon,
        actor_id: req.body.auth_token.actor_id
    };

    var response = function (status, msg, newToken) {
        res.status(status).json({
            new_auth_token: newToken
        });
    };

    MomentCtr.initMoment(params, response);
})


/*
   Complete a moment and login
*/
.put(ACTOR.getActor, function (req, res) {
    var params = {
        resource_actor: req.body.resource_actor,
        auth_token: req.body.auth_token,
        status: req.body.status,
        lat: req.body.auth_token.lat || 0,
        lon: req.body.auth_token.lon || 0,
        limit: 10,
        offset: 0
    };

    var response = function (status, msg, explore_list) {
        res.status(status).json({
            msg: msg,
            explore_list: explore_list || [] });
    };
    MomentCtr.completeMoment(params, response);
});



moment.route("/explore")
/*
   get latest moment since last updated
*/
.post(function (req, res) {
    var params = {
        auth_token: req.body.auth_token,
        //resource_actor : req.body.resource_actor,
        offset: req.body.offset,
        limit: req.body.limit,
        lat: req.body.auth_token.lat || 0,
        lon: req.body.auth_token.lon || 0
    };
    MomentCtr.getNewExplore(params, function (status, explore_list) {
        res.status(status).json({
            explore_list: explore_list || []
        });
    });
});


moment.route("/action").all(AUTH.parseAction) //,tokenValidator('action'))
.post(function (req, res) {
    var params = {
        auth_token: req.body.auth_token,
        action_token: req.body.action_token,
        body: req.body
    };
    LOG.info("body");
    LOG.info(req.body);
    var response = function (status, payload) {
        res.status(status).json({
            payload: payload
        });
    };
    MomentCtr.doAction(params, response);
});



module.exports = moment;