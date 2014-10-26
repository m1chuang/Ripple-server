var jwt = require('jsonwebtoken');
var nconf = require('nconf');

var signToken =  function( type, payload)
{
    var token = jwt.sign(payload, nconf.get('secrete-key')['token'][type] );
    return token;
};

var verifyToken = function(type, token, verified) {
  return jwt.verify(token, nconf.get('secrete-key')['token'][type]  , {}, verified);
};

module.exports.verifySecret = function( token, key, res, next) {
  return jwt.verify(token, key, {}, function(){
    if(err)
            {
                res.status(401).json( { err:'invalid auth token' } );
            }else
            {
                req['auth_token'] = payload;
                next();
            }
  });
};

module.exports.newBaseToken = function(device, next)
{
    var payload = {
        client_auth_key : device.client_auth_key,
        device_id : device.device_id,
    }
    var token = jwt.sign(payload, nconf.get('auth-secrete-key') );
    next(device, token);
};

module.exports.authenticate = function( req, res, next )
{
    var token = req.body.token || '';

    if( token == 'new' )
    {
        req['auth_token'] = 'new';
        next();
    }
    else
    {
        verifyToken( token, 'auth', function( err, payload)
        {
            if(err)
            {
                res.status(401).json( { err:'invalid auth token' } );
            }else
            {
                req['auth_token'] = payload;
                next();
            }
        });
    }

};

module.exports.parseAction = function( req, res, next)
{
    var token = req.body.token || '';
    verifyToken( token, 'action', function( err, payload)
    {
        if(err)
            {
                res.status(401).json( { err:'invalid action token' } );
            }else
            {
                req['action_token'] = payload;
                next();
            }
    });
}

module.exports.issueActionToken = function( action, options)
{
    var tasks = {
        like: function(options)
        {
            var payload = {
                action : 'like',
                target_did: options['target_did'],
                target_mid: options['target_mid'],
            };
            return signToken('action', payload);
        },
        connect: function(options)
        {
            var payload = {
                action : 'connect',
                target_secret: jwt.sign(
                    {
                        target_pubnub_key:options['pubnub_key']
                    },
                    options['target_secret_key'])
            };
            return signToken('action', payload);
        }
    }
    task[action](options);
}