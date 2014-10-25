var jwt = require('jsonwebtoken');
var nconf = require('nconf');

module.exports.issueToken = function(payload) {

    var token = jwt.sign(payload, nconf.get('auth-secrete-key') );
    return token;
};

module.exports.verifyToken = function(token, verified) {
  return jwt.verify(token, nconf.get('auth-secrete-key') , {}, verified);
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
        jwt.verify( token, nconf.get('auth-secrete-key'), {}, function( err, payload)
        {

            if(err)
            {
                res.status(401).json( { err:'invalid auth token' } );
            }else
            {
                req['auth_token'] = payload;
                next();
            }
        })
    }

};
