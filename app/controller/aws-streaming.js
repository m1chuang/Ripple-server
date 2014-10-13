// Initialize aws client
// =====================
//var config = require('../config/' + process.env.NODE_ENV);
var Knox = require('knox');
var moment = require('moment');
var crypto = require('crypto');
var busboy = require('connect-busboy');
// Create the knox client with your aws settings
Knox.aws = Knox.createClient({
  key: 'AKIAJD7KI7ZEE5EDJ3IA',
  secret: '63ntyUDrdj5HQIcgq1Zv6yWF6lj3iPDZpWEiqEM8',
  bucket: 'glimpsetest',
  region: 'us-west-2'
});

// S3 upload service - stream buffers to S3
// ========================================
var s3UploadService = function(req, next) {
  req.files = {};
  console.log(req.busboy);
  req.busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
    if (!filename) {
      // If filename is not truthy it means there's no file
      return;
    }
    // Create the initial array containing the stream's chunks
    file.fileRead = [];

    file.on('data', function(chunk) {
      // Push chunks into the fileRead array
      this.fileRead.push(chunk);
    });

    file.on('error', function(err) {
      console.log('Error while buffering the stream: ', err);
    });

    file.on('end', function() {
      // Concat the chunks into a Buffer
      var finalBuffer = Buffer.concat(this.fileRead);

      req.files[fieldname] = {
        buffer: finalBuffer,
        size: finalBuffer.length,
        filename: filename,
        mimetype: mimetype
      };

      var headers = {
        'Content-Length': req.files[fieldname].size,
        'Content-Type': req.files[fieldname].mimetype,
        'x-amz-acl': 'public-read'
      };

      Knox.aws.putBuffer( req.files[fieldname].buffer, pathToArtwork, headers, function(err, response){
        if (err) {
          console.error('error streaming image: ', new Date(), err);
          return next(err);
        }
        if (response.statusCode !== 200) {
          console.error('error streaming image: ', new Date(), err);
          return next(err);
        }
        console.log('Amazon response statusCode: ', response.statusCode);
        console.log('Your file was uploaded');
        next();
      });
    });
  });

  req.busboy.on('error', function(err) {
    console.error('Error while parsing the form: ', err);
    next(err);
  });

  req.busboy.on('finish', function() {
    console.log('Done parsing the form!');
    // When everythin's done, render the view
    next(null, 'http://www.google.com');
  });

  // Start the parsing
  req.pipe(req.busboy);
};

module.exports = s3UploadService;