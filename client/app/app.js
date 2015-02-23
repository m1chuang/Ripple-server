var unirest = require('unirest');
var uuid = require('node-uuid');
var async = require('async');
var array = require('array');
var PUBNUB = require('pubnub');


/********************
**  PUBNUB CLIENT  **
*********************/

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

PubnubClient.prototype.sub = function(channel, cb){
    this.pubnub.subscribe({
      channel: channel,
     // windowing: 1000,
      presence: (m)=>{console.log(m)},
      callback:cb,
      connect: ()=>{console.log("Connected to "+channel)},
      disconnect: ()=>{console.log("Disconnected")},
      reconnect: ()=>{console.log("Reconnected")},
      error: ()=>{console.log("Network Error")}
    });
  };


PubnubClient.prototype.pub = function(channel,msg){
    this.pubnub.publish({
         channel : channel,
         message :msg
     });
    console.log('Publishing to channel '+channel);
  };


/*****************
**  API CLIENT  **
 ****************/

var apiClient = function (device_info,env){
  this.data=device_info;
  this.env=env;
  this.pn = new PubnubClient();

  this.post = (endpoint, params, next)=>{
    var url = this.data.baseURL[env||'prod']+endpoint;
    params.auth_token = this.data.auth_token|| params.auth_token;
    console.log('Sending POST to...'+url+ '\n'+params);
    unirest.post(url).header('Accept','application/json').send(params).end((response)=>{
      console.log(response.body);
      next(null,response.body);
    });
  };

  this.postMulti = (endpoint, data, next)=>{
    var url = this.data.baseURL[env||'prod']+endpoint;
    console.log('Sending POST Multi to...'+url+ '\n'+data);
    unirest.post(url).field('lat',this.data.location.lat).field('lon',this.data.location.lon).field('auth_token',this.data.auth_token).attach('file',data.image).end((response)=>{
      console.log(response.body);
      next(null,response.body)
    });
  };

  this.put = (endpoint, data, next)=>{
    var url = this.data.baseURL[env||'prod']+endpoint;
    data.auth_token = this.data.auth_token|| data.auth_token;
    console.log('api put...');
    unirest.put(url).header('Accept','application/json').send(data).end((response)=>{
      console.log(response.body);
      next(null,response.body);
    })
  }
}
apiClient.prototype.initPubnub = function(){
  this.pn.init({
     publish_key: this.data.pubnub_pub_key,
     subscribe_key: this.data.pubnub_sub_key,
     auth_key:this.data.pubnub_auth_key
  });
  console.log('PUBNUB initialized.');
};

apiClient.prototype.connectServer = function(){
  this.pn.sub(this.data.channel_uuid,(msg)=>{
        console.log(msg);
        switch(msg.type){
          case '001'://new logins from subscribtion
            console.log(this.data.subscribe_list.items.find({uuid:msg.uuid}).moments);
            console.log(this.data.subscribe_list.items.find({uuid:msg.uuid}));
            this.data.subscribe_list.items.find({uuid:msg.uuid}).moments.push({
              image_url:msg.image_url,
              status:msg.status,
              //timestamp:Date.now()
            });

            break;
          case '002':
            break;
          case '003':
            break;
        };
  });
  console.log('Connecting server...');
};
apiClient.prototype.backup = function(){
  console.log('Soving some device info to server...');
};
apiClient.prototype.pokeServer = function(){
  this.pn.pub(this.data.channel_uuid);
  console.log('Poking server...');
};

/***************
**  LOGIN UI  **
 ***************/

function LoginUI (apiClient){

  this.api = apiClient;
  this.photo = '';
  this.status = '';

  this.init_moment = function(photo,next){
    console.log('init_moment...');
    this.photo=photo;
    this.api.postMulti('/moment',{image:photo||'./img.jpg'},
      (err, response)=>{
        console.log(response);
        console.log('Update device info.');
        this.api.data.auth_token=response.new_auth_token;
        this.api.data.uuid = response.uuid;
        if(next){
          next();
        }else{
          console.log('Subscribing to server...');
          this.api.connectServer();
        }
      });
  };

  this.submit_moment = function(status,next){

    this.status=status || 'yo';
    this.api.put('/moment', {status:status},(err, response)=>{
      console.log('submit_moment...');
      if(!next){
        console.log(response);
      }
      if(!response.explore_list){
        if(next)next('err');
      }else{

        this.api.data.explore_list.rePopulate(response.explore_list,()=>{
          console.log('populating explore...');
          if(next)next();
        });
      }

    });
  };

};

/****************************
**  moment list data type  **
 ****************************/

function moment_list(){
  this.items = array();
}

moment_list.prototype.rePopulate = function(info_list,next){
  console.log('populate list itmes...');
  //console.log(info_list);
  this.items = array();
  async.eachSeries(info_list,(i,next)=>{
    this.items.push({
      uuid:i.uuid,
      image_url:i.image_url,
      distance:i.distance,
      status:i.status,
      action_token:i.action_token
    });
    next();
  },
  (err)=>{next();}
  );
}



/*****************
**  EXPLORE UI  **
 *****************/

function ExploreUI (apiClient){
  this.api=apiClient;
  this.api.data.explore_list.subscribe = (index, next)=>{
    console.log('substribing to explore item: '+index);
    var item = this.api.data.explore_list.items[index];
    this.api.post('/moment/action', {action_token:item.action_token.subscribe},(response)=>{
      this.api.data.subscribe_list.addItem(item);
    });
  }
  this.nextPage = function(){
    console.log('[POST api/explore/nextPage]');
    return this
  }
  this.refresh = function(next){
    this.api.post('/moment/explore', {auth_token:''},(err,response)=>
      {
        this.api.data.explore_list.rePopulate(response.explore_list,()=>
        {
          console.log('Refresh explore list...');
          console.log(this.api.data)
          next();
        });
      });
  };
};//eof


/*******************
**  SUBSCRIBE UI  **
********************/

function SubscribeUI(apiClient){
  this.api=apiClient;
  this.api.data.subscribe_list.addItem = (item)=>{
    console.log('Adding '+item.status+ ' to subscribe list...');
    this.api.data.subscribe_list.items.push({
      uuid:item.uuid,
      image_url:item.image_url,
      distance:item.distance,
      status:item.status,
      nickname:'',
      moments:new array()
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

};//eof


/***************
**  MAIN APP  **
****************/

function App(params,next){
  this.data =
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
    login_status:true,

    subscribe_list:new moment_list(),
    explore_list:new moment_list(),
    chat_list:[],
    self_list:[]
  }
  this.api = new apiClient(this.data, params.env || 'prod');

  this.control = {
    login:new LoginUI(this.api),
    explore:new ExploreUI(this.api),
    subscriber:new SubscribeUI(this.api),
  }
  this.init= function(next){

    this.api.post('/device',{
      auth_token:'new'
    },(err,params)=>
      {
        this.data.auth_token = params.auth_token;
        this.data.pubnub_auth_key = params.pubnub_key;
        this.data.channel_uuid = params.uuid;
        this.data.login_status = params.relogin;
        this.api.connectServer();
        this.api.initPubnub();
        if(next)next();
      }
    );
  };
  this.init(next);
}

App.prototype.move = function(){
  this.data.location.lat += 1;
  this.data.location.lon += 1;
};
App.prototype.login = function(status, image, location){
  this.data.location = location || this.data.location;
  this.control.login.init_moment(image,()=>
  {
    setTimeout(()=>
    {
      this.control.login.submit_moment(status,()=>console.log(this));
    },1000);
  });
};
App.prototype.v_exp = function(){
  this.control.explore.refresh(()=>
    console.log(this.data.explore_list.items)
  );

};
App.prototype.sub = function(index){
  this.data.explore_list.subscribe(index,(item)=>{
    console.log(response);
  })
};
App.prototype.v_sub = function(){
  this.control.subscriber.refresh();
};
App.prototype.v_info = function(){
  this.api.post('/device/info',{},(device)=>{
    console.log(device);
  });
};

var a;
a= new App({env:'local'},()=>{
  console.log(a);
});
return App
//a.login('mc','./img.jpg')
//