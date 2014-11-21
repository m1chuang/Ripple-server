var nconf = require('nconf');
/*
    Logger
*/
var logLevel = process.env.LOGLEVEL || 'info',
    winston = require('winston');
var Logentries = require('winston-logentries');
var Loggly = require('winston-loggly').Loggly;

var logger = new winston.Logger({
    transports: [
        new winston.transports.Console(
        {
            colorize: true,
            level: logLevel,

        })
    /*
    new winston.transports.Logentries({
        token: '54360b32-87c6-4b3f-b932-ff258bee5e50',
        level: logLevel
    }),
    new winston.transports.Loggly({
             inputToken: 'a14bc370-6230-488a-82c5-b6b02a72f4f9',
            json: true,
            level: logLevel,
            stripColors: true,
            subdomain: 'neshorange',
            tags: ['glimpse']
    })*/
    ],
    exceptionHandlers: [
      new winston.transports.Console(
      {
            colorize: true,
            json: true
      })
    ]
});
process.on('uncaughtException', function (err) {
    //logger.error('uncaughtException', { message : err.message, stack : err.stack }); // logging with MetaData
    //process.exit(1); // exit with failure
});

logger.exitOnError = false;












/*
    Validation
*/

var validator = require('is-my-json-valid');

var route= function(resource, type)
            {
                return function(req,res,next)
                {
                    var validate = validator(nconf.get('validation')[resource][type]);
                    validate(req.body)? next() : res.status( 400 ).json({ errs : validate.errors });
                }
            };

var token = function(tokenType)
            {
                return function(req,res,next)
                {
                    if(!req.body.action_token || !req.body.action_token.action)
                    {
                        console.log( 'res.body');
                        console.log( req.body);
                        res.status( 400 ).json({ errs : 'invalid action token' });
                    }
                    else{
                        console.log( 'res.body');
                        console.log( req.body);
                        var validate = validator(nconf.get('validation').token[tokenType][req.body.action_token.action]);
                        validate(req.body.action_token)? next() : res.status( 400 ).json({ errs : validate.errors });
                    }

                }
            };




module.exports = {logger:logger,validator:{route:route, token:token}};
