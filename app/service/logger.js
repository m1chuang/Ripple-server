
var logger,
    logLevel = process.env.LOGLEVEL || 'info',
    winston = require('winston');
var Logentries = require('winston-logentries');
var Loggly = require('winston-loggly').Loggly;

logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
            colorize: true,
            level: logLevel
        }),
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
    })
  ]
});

module.exports = logger