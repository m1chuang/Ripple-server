var chalk = require('chalk');
var AWS = require('aws-sdk');
var path = require('path');
var nconf = require('nconf');
var LOG = require('../service/logger');
    // For dev purposes only

AWS.config.update(
{
    accessKeyId: nconf.get('aws:accessKeyId'),
    secretAccessKey: nconf.get('aws:secretAccessKey'),
    region: nconf.get('aws:region'),
});


exports.upload = function( fileData, fileInfo )
{

    var s3 = new AWS.S3();
    var buf = new Buffer(fileData.replace(/^data:image\/\w+;base64,/, ""),'base64');

    LOG.log( {
    accessKeyId: nconf.get('aws:accessKeyId'),
    secretAccessKey: nconf.get('aws:ecretAccessKey'),
    region: nconf.get('aws:region'),
} );
    s3.putObject(
        {
            Bucket: 'glimpsing',
            Key: fileInfo['key']+'.jpg',
            Body: buf,
            ACL: 'public-read',
            ContentType:'multipart',
        },
        function( resp )
        {
            resp? LOG.log(chalk.red(resp)) : LOG.log( chalk.blue('Successfully uploaded.') );
        });


};
var Uploader = require('s3-streaming-upload').Uploader,
    upload = null



exports.s3_test = function (fieldname, file, filename, enconding, next){
    upload = new Uploader({
        // credentials to access AWS
        accessKey:  nconf.get('aws:accessKeyId'),
        secretKey:  nconf.get('aws:secretAccessKey'),
        bucket:     nconf.get('aws:test-bucket'),
        objectName: filename,
        objectParams: {
            ACL: 'public-read'
        },
        stream:     file
    });

    upload.on('completed', function (err, res) {
        LOG.log('upload completed');
        next( err, res );
    });

    upload.on('failed', function (err) {
        LOG.log('upload failed with error', err);
    });

}