var chalk = require('chalk');
var AWS = require('aws-sdk');

    // For dev purposes only

AWS.config.update({
    accessKeyId: 'AKIAJD7KI7ZEE5EDJ3IA',
    secretAccessKey: '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',
    region: 'us-west-2'
});


exports.upload = function(fileData, fileInfo, cb) {

    var s3 = new AWS.S3();
    var buf = new Buffer(fileData.replace(/^data:image\/\w+;base64,/, ""),'base64');

    console.log(buf);
    s3.putObject({
        Bucket: 'glimpsing',
        Key: fileInfo['key']+'.jpg',
        Body: buf,
        ACL: 'public-read',
        ContentType:'image/png',
        ContentEncoding: 'base64'

    },function (resp) {
        console.log(arguments);
        console.log(chalk.blue('Successfully uploaded.'));

    });


}