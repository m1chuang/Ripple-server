var jwt = require('jsonwebtoken');
var nconf = require('nconf');
var uuid = require('node-uuid');
var LOG = require('../service/util').logger;
var validator = require('../service/util').validator;
var crypto = require('crypto'),
  algorithm = 'aes-256-ctr',// update to encryption with GCM later
  key = nconf.get('secret-key')['encription'];

var encrypt =function (text) {/*
    //var iv = new Buffer(crypto.randomBytes(12)); // ensure that the IV (initialization vector) is random
    var cipher = crypto.createCipher(algorithm, key);//crypto.createDecipheriv(algorithm, key, iv);
    LOG.info('text');
    LOG.info(text);
    var encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    LOG.info(cipher);
    LOG.info('encrypted');
    LOG.info(encrypted);
    //var tag = cipher.getAuthTag();
    return encrypted//+'$'+ tag+'$'+ iv.toString('hex')
    */
   return text
};
module.exports.encrypt = encrypt;

var decrypt =  function (encrypted) {/*
    LOG.info('encrypted');
    LOG.info(encrypted);
    //var blob = encrypted.spilt('$');
    //var iv = new Buffer(blob[2], 'hex');
    var decipher = crypto.createDecipher(algorithm, key);
    //decipher.setAuthTag(blob[1]);
    var dec = decipher.update(encrypted, 'hex', 'utf8')
    dec += decipher.final('utf8');
    return dec;
    */
   return encrypted
};
module.exports.decrypt = decrypt;

var signToken =  function( type, payload)
{
    var token = jwt.sign(payload, nconf.get('secret-key')['token'][type] );
    return token;
};
module.exports.signToken = signToken;
var verifyToken = function(type, token, verified) {
  return jwt.verify(token, nconf.get('secret-key')['token'][type] , {}, verified);
};
module.exports.verifyToken = verifyToken;

module.exports.verifySecret = function( secret, key, res, next) {
  req['action_token'] = decript(secret);
  LOG.info('secrete')
  LOG.info(req['secret'])

};

module.exports.newAuthToken = function(token, renewAid, next)
{
    var actor_id = (renewAid)? uuid.v4(): token.actor_id;
    var token =  signToken('auth',
    {
        device_id : token.device_id,
        actor_id: actor_id || '',
        lat:token.lat || 0,
        lon:token.lon || 0
    });
    next(token);
};

module.exports.registerOrAuth = function( req, res, next )
{
    var token = req.body.auth_token || '';
    LOG.info('body::');
    LOG.info( req.body);
    LOG.info('body::');
    if( token === 'new' )
    {
        req.body.auth_token = 'new';
        LOG.info('innnnbody::');

        next();
    }
    else
    {
        verifyToken('auth',token, function( err, payload)
        {
            if(err)
            {
                res.status(401).json( { err:err } );
            }else
            {
                LOG.info('verify auth_token:');
                LOG.info( payload);
                req.body.auth_token = payload;
                next();
            }
        });
    }

};
module.exports.authenticate = function( req, res, next )
{
    var token = req.body.auth_token || '';

    verifyToken('auth',token, function( err, payload)
    {
        if(err || typeof payload.device_id !== 'string' )
        {
            res.status(401).json( { err:err } );
        }else
        {
            LOG.info('verify auth_token:');
            LOG.info( payload);
            req.body.auth_token = payload;
            LOG.info( req.body.auth_token);
            next();
        }
    });
};

module.exports.parseAction = function( req, res, next)
{
    var token = req.body.action_token || '';
    var secret = JSON.parse(JSON.parse(decrypt(token)));
    LOG.info( '....res.body');
    LOG.info( secret);
    req.body.action_token = secret;
    next();

}

module.exports.issueActionToken = function( action, secrets, next)
{
    LOG.info( 'auth  issue action token');
    LOG.info( secrets);

    var tasks = {
        like: function(next)
        {
            secrets.action = 'like';
            var token = encrypt(JSON.stringify(JSON.stringify(secrets)));


            next( token );
        },
        subscribe: function(next)
        {
            secrets.action = 'subscribe';
            var token = encrypt(JSON.stringify(JSON.stringify(secrets)));


            next( token );
        },
        connect: function(next)
        {
            var secret = encrypt(JSON.stringify(JSON.stringify(secrets)));
            var token = signToken('action',
                {
                    action : 'connect',
                    encrypted: secret
                });
            next(token);
        }
    };

    tasks[action](next);
}