
var DEVICE = require('../../api/device/deRoute');

var AUTH = require('../../api/service/auth');


function mockDevice (options) {

  this.model = new DEVICE({
        device_id: options.did,
        channel_uuid: options.channel_uuid,
        pubnub_key: options.pubnub_key,
        moments: options.moments,
        friends: options.friends
  });
  this.auth_token = "new";
  this.relogin = '';
  this.pubnub_key = '';
  this.uuid = '';
}

module.exports = mockDevice;
