
var ACTOR = require('../../api/actor');

var AUTH = require('../../api/service/auth');

var momentController = require('../../api/moment/moControl');

var nconf = require('nconf');
nconf.argv().env().file({file:__dirname + '/../../api/config.json' });
var uuid = require('node-uuid');



function mockActor(options)
{
  var did = uuid.v4();
  var aid = uuid.v4();
  this.model = new ACTOR({
                    actor_id:aid,
                    device_id:did,
                    pubnub_key: uuid.v4(),
                    explore:[],
                    health:(options.health)?options.health:'established',
                    relation:(options.relation)?options.relation:[],
                    connection:[]
                    });
  this.auth_token = AUTH.signToken('auth',
      {
        device_id : did,
        actor_id:aid
      });
  this.action_token='';

}

mockActor.prototype.addRelation = function(target, type, status){
  var info = {
    actor_id: target.model.actor_id,
    pubnub_key: target.model.pubnub_key,
    type:type,
    status:status
  };



  this.model.relation = ("undefined" != typeof this.relation)? this.relation.push(info):new Array(info);;
  console.log(this.model.relation);
};

mockActor.prototype.addConnection = function(params, target){
  var info = {
    actor_id: target.model.actor_id,
    channel_id: params.channel_id,
    type:'like',
  };

  this.model.connection = ("undefined" != typeof this.connection)? this.connection.push(info):new Array(info);;
  target.model.connection = ("undefined" != typeof target.model.connection)? target.model.connection.push(info):new Array(info);;
  console.log(this.model);
  console.log(target.model);
};

module.exports = mockActor;