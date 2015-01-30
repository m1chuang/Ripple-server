"use strict";

var chalk = require("chalk");
var AWS = require("aws-sdk");
var path = require("path");
var nconf = require("nconf");
var LOG = require("../service/util").logger;

var uuid = require("node-uuid");
// For dev purposes only

AWS.config.update({
    accessKeyId: nconf.get("aws:accessKeyId"),
    secretAccessKey: nconf.get("aws:secretAccessKey"),
    region: nconf.get("aws:region") });
var s3_url = nconf.get("S3").glimpse_test;

var s3_test = function (fieldname, file, filename, enconding, next) {
    upload = new Uploader({
        // credentials to access AWS
        accessKey: nconf.get("aws:accessKeyId"),
        secretKey: nconf.get("aws:secretAccessKey"),
        bucket: nconf.get("aws:test-bucket"),
        objectName: filename,
        objectParams: {
            ACL: "public-read"
        },
        stream: file
    });

    upload.on("completed", function (err, res) {
        LOG.log("upload completed");
        next(err, res);
    });

    upload.on("failed", function (err) {
        LOG.log("upload failed with error", err);
    });
};

module.exports.multipart = function (req, res, next) {
    req.busboy.on("file", function (fieldname, file, filename, encoding) {
        filename = uuid.v4();
        req.body.image_url = s3_url + filename;
        LOG.info("on:file: " + req.body.image_url);
        s3_test(fieldname, file, filename, encoding, function (err, s3_response) {});
    });

    req.busboy.on("field", function (fieldname, value, valTruncated, keyTruncated) {
        LOG.info("on:field");
        LOG.info(fieldname);
        req.body[fieldname] = value;
    });

    req.busboy.on("finish", function () {
        LOG.info("once:end");
        next();
    });

    req.pipe(req.busboy);
};

module.exports.upload = function (fileData, fileInfo) {
    var s3 = new AWS.S3();
    var buf = new Buffer(fileData.replace(/^data:image\/\w+;base64,/, ""), "base64");

    LOG.log({
        accessKeyId: nconf.get("aws:accessKeyId"),
        secretAccessKey: nconf.get("aws:ecretAccessKey"),
        region: nconf.get("aws:region") });
    s3.putObject({
        Bucket: "glimpsing",
        Key: fileInfo.key + ".jpg",
        Body: buf,
        ACL: "public-read",
        ContentType: "multipart" }, function (resp) {
        resp ? LOG.log(chalk.red(resp)) : LOG.log(chalk.blue("Successfully uploaded."));
    });

};
var Uploader = require("s3-streaming-upload").Uploader,
    upload = null

// s3Stream = require('s3-upload-stream')(new AWS.S3()),
;