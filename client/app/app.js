var unirest = require('unirest');
var uuid = require('node-uuid');
var async = require('async');
var array = require('array');
var PUBNUB = require('pubnub');

var PubnubClient=function(){
  this.initStatus=false;
  this.pubnub;
}
PubnubClient.prototype.init = function(params){
  this.pubnub = PUBNUB.init({
     publish_key: params.pubnub_pub_key,
     subscribe_key: params.pubnub_sub_key,
     auth_key:params.pubnub_auth_key,
     origin: 'pubsub.pubnub.com',
     ssl: true
  });
  this.initStatus=true;
  console.log('PUBNUB initializingi.'+params);
};

PubnubClient.prototype.sub = function(channel){
    this.pubnub.subscribe({
      channel: channel,
     // windowing: 1000,
      presence: function(m){console.log(m)},
      callback: function(message){
        console.log(message);
        switch(message.type){
          case server:
            break;
          case message:
            break;
          case update:
            break;
        }
      },
      connect: function(){console.log("Connected to "+channel)},
      disconnect: function(){console.log("Disconnected")},
      reconnect: function(){console.log("Reconnected")},
      error: function(){console.log("Network Error")}
    });
  };

PubnubClient.prototype.pub = function(channel){
    this.pubnub.publish({
         channel : channel,
         message :'msg'
     });
    console.log('Publish to channel '+channel);
  };

var apiClient = function (device_info,env){
  this.device_info=device_info;
  this.env=env;
  this.pn = new PubnubClient();

  this.post = function(endpoint, params, next){
    var url = this.device_info.baseURL[env||'prod']+endpoint;
    params.auth_token = this.device_info.auth_token|| params.auth_token;
    console.log('Sending POST to...'+url+ '\n'+params);
    unirest.post(url).header('Accept','application/json').send(params).end(function(response){
      console.log(response.body);
      next(null,response.body);
    });
  };

  this.postMulti = function(endpoint, data, next){
    var url = this.device_info.baseURL[env||'prod']+endpoint;
    console.log('Sending POST Multi to...'+url+ '\n'+data);
    unirest.post(url).field('lat',this.device_info.location.lat).field('lon',this.device_info.location.lon).field('auth_token',this.device_info.auth_token).attach('file',data.image).end(function(response){
      console.log(response.body);
      next(null,response.body)
    });
  };

  this.put = function(endpoint, data, next){
    var url = this.device_info.baseURL[env||'prod']+endpoint;
    data.auth_token = this.device_info.auth_token|| data.auth_token;
    unirest.put(url).header('Accept','application/json').send(data).end(function(response){
      console.log('api put...'+ '\n'+response.body);
      next(null,response.body);
    })
  }
}
apiClient.prototype.initPubnub = function(){
  this.pn.init({
     publish_key: this.device_info.pubnub_pub_key,
     subscribe_key: this.device_info.pubnub_sub_key,
     auth_key:this.device_info.pubnub_auth_key
  });
  console.log('PUBNUB initialized.');
};
apiClient.prototype.connectServer = function(){
  this.pn.sub(this.device_info.channel_uuid)
  console.log('Connecting server...');
};
apiClient.prototype.pokeServer = function(){
  this.pn.pub(this.device_info.channel_uuid);
  console.log('Poking server...');
};
function LoginUI (apiClient,data){

  this.api = apiClient;
  this.data = data;
  this.photo = '';
  this.status = '';

  this.init_moment = function(photo,next){
    console.log('init_moment...');
    this.photo=photo;
    this.api.postMulti('/moment',{image:photo||'./img.jpg'},
      (function(err, response){
        console.log(response);
        console.log('Update device info.');
        this.api.device_info.auth_token=response.new_auth_token;
        this.api.device_info.uuid = response.uuid;
        if(next){
          next();
        }else{
          console.log('Subscribing to server...');
          this.api.pn.sub(response.uuid);
        }
      }).bind(this)
    );
  };

  this.submit_moment = function(status,next){

    this.status=status || 'yo';
    this.api.put('/moment', {status:status},(function(err, response){
      console.log('submit_moment...');
      if(!next){
        console.log(response);
      }
      if(!response.explore_list){
        if(next)next('err');
      }else{

        this.data.explore_list.rePopulate(response.explore_list,function(){
          console.log('populating explore...');
          if(next)next();
        });
      }

    }).bind(this));
  };

};

var moment_list = function(api){
  this.api = api;
  this.items = array();
}

moment_list.prototype.rePopulate = function(info_list,next){
  console.log('populate list itmes...');
  //console.log(info_list);
  this.items = array();
  async.eachSeries(info_list,(function(i,next){
    this.items.push({image_url:i.image_url,distance:i.distance,status:i.status,action_token:i.action_token
    });
    next();
  }).bind(this),
  (function(err){
    next();
  }).bind(this));
}



function ExploreUI (apiClient, data){
  this.data = data;
  this.api=apiClient;
  this.data.explore_list.subscribe = function(index, next){
    console.log('substribing to explore item: '+index);
    var item = this.items[index];
    this.api.post('/moment/action', {action_token:item.action_token.subscribe},(function(response){
      console.log(response);
      this.data.subscribe_list.add(item);
    }).bind(this));
  }
  this.nextPage = function(){
    console.log('[POST api/explore/nextPage]');
    return this
  }
  this.refresh = function(next){
    this.api.post('/moment/explore', {auth_token:''},(function(err,response){
        this.data.explore_list.rePopulate(response.explore_list,(function(){
          console.log('Refresh explore list...');
          console.log(this.data)
          next();
        }).bind(this));
      }).bind(this)
    );
  }
};

function SubscribeUI(apiClient, data){
  this.data = data;
  this.api=apiClient;
  this.data.subscribe_list.add = function(item){
    console.log('Adding '+item.status+ ' to subscribe list...');
    this.data.subscribe_list.push({
      image_url:item.image_url,
      distance:itme.distance,
      status:item.status,
      nickname:'',
      moments:[]
    })
  };
  this.nextPage = function(data){
    console.log('api call to subscriber nextPage');
    return this
  }
  this.refresh = function(data){
    console.log('api call to subscriber refresh');
    return tihs
  }
};

function App(params,next){
  this.device_info =
  {
    location:{lat:20,lon:11},
    auth_token:'',
    pubnub_pub_key:'demo',//'pub-c-59368519-7ab7-4419-afc0-6ed2cfa0b43d',
    pubnub_sub_key:'demo',//'sub-c-6f5b3a4a-a4ad-11e4-a9d4-02ee2ddab7fe',
    pubnub_auth_key:'',
    channel_uuid:'',
    baseURL:{
      local:'http://127.0.0.1:8000/api',
      prod:'http://glimpse-prod-env-a22zhqiyzs.elasticbeanstalk.com/api'
    },
    login_status:true
  }
  this.api = new apiClient(this.device_info, params.env || 'prod');
  this.data =
  {
    explore_list:new moment_list(this.api),
    subscribe_list:new moment_list(this.api),
    chat_list:[],
    self_list:[]
  }
  this.content = {
    login:new LoginUI(this.api, this.data),
    explore:new ExploreUI(this.api, this.data),
    subscriber:new SubscribeUI(this.api, this.data),
  }
  this.init= function(next){

    this.api.post('/device',{
      auth_token:'new'
    },(function(err,params){
        this.device_info.auth_token = params.auth_token;
        this.device_info.pubnub_auth_key = params.pubnub_key;
        this.device_info.channel_uuid = params.uuid;
        this.data.subscribe_list = params.friend_list;
        this.data.login_status = params.relogin;
        this.api.initPubnub();
        next.call(this);
      }).bind(this)
    );
  };
  this.init(next);
}

App.prototype.move = function(){
  this.device_info.location.lat += 1;
  this.device_info.location.lon += 1;
};
App.prototype.login = function(status, image, location){
  this.data.location = location || this.data.location;
  this.content.login.init_moment(image,(function(){
    setTimeout((function(){
      this.content.login.submit_moment(status,
      (function(){
        console.log(this);
      }).bind(this));
    }).bind(this),1000);
  }).bind(this));
};
App.prototype.view_explore = function(){
  this.content.explore.refresh((function(){
    console.log(this.data.explore_list.items);
  }).bind(this));
};
App.prototype.subscribe = function(index){
  this.data.explore_list.subscribe(index,function(item){

    console.log(response);
  })
};
App.prototype.view_subscriber = function(){
  this.content.subscriber.refresh();
};


var a= new App({env:'local'},function(){
  /*
  setTimeout((function(){
        this.login('big mac','./img.jpg');
    }).bind(this),1000);
*/
  //this.view_explore();

});
//a.content.login.submit_moment('mc_status');