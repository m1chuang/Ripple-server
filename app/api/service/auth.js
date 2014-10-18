var jwt = require('jsonwebtoken');
var nconf = require('nconf');

module.exports.issueToken = function(payload) {

    var token = jwt.sign(payload, nconf.get('auth-secrete-key') );
    return token;
};

module.exports.verifyToken = function(token, verified) {
  return jwt.verify(token, nconf.get('auth-secrete-key') , {}, verified);
};

module.exports.authenticate = function( token, valid, invalid )
{
    jwt.verify( token, nconf.get('auth-secrete-key'), {}, function( err, payload)
    {
        if(err)
        {
            return invalid( err);
        }else
        {
            return valid( payload);
        }
    })
}