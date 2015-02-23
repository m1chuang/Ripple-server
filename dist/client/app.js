"use strict";

var unirest = require("unirest");
var uuid = require("node-uuid");
var async = require("async");
var array = require("array");
var PUBNUB = require("pubnub");


/********************
**  PUBNUB CLIENT  **
*********************/

var PubnubClient = function () {
  this.initStatus = false;
  this.pubnub;
};
PubnubClient.prototype.init = function (params) {
  this.pubnub = PUBNUB.init({
    publish_key: params.pubnub_pub_key,
    subscribe_key: params.pubnub_sub_key,
    auth_key: params.pubnub_auth_key,
    origin: "pubsub.pubnub.com",
    ssl: true
  });
  this.initStatus = true;
  console.log("PUBNUB initializingi." + params);
};

PubnubClient.prototype.sub = function (channel, cb) {
  this.pubnub.subscribe({
    channel: channel,
    // windowing: 1000,
    presence: function (m) {
      console.log(m);
    },
    callback: cb,
    connect: function () {
      console.log("Connected to " + channel);
    },
    disconnect: function () {
      console.log("Disconnected");
    },
    reconnect: function () {
      console.log("Reconnected");
    },
    error: function () {
      console.log("Network Error");
    }
  });
};


PubnubClient.prototype.pub = function (channel, msg) {
  this.pubnub.publish({
    channel: channel,
    message: msg
  });
  console.log("Publishing to channel " + channel);
};


/*****************
**  API CLIENT  **
 ****************/

var apiClient = function (device_info, env) {
  var _this = this;
  this.data = device_info;
  this.env = env;
  this.pn = new PubnubClient();

  this.post = function (endpoint, params, next) {
    var url = _this.data.baseURL[env || "prod"] + endpoint;
    params.auth_token = _this.data.auth_token || params.auth_token;
    console.log("Sending POST to..." + url + "\n" + params);
    unirest.post(url).header("Accept", "application/json").send(params).end(function (response) {
      console.log(response.body);
      next(null, response.body);
    });
  };

  this.postMulti = function (endpoint, data, next) {
    var url = _this.data.baseURL[env || "prod"] + endpoint;
    console.log("Sending POST Multi to..." + url + "\n" + data);
    unirest.post(url).field("lat", _this.data.location.lat).field("lon", _this.data.location.lon).field("auth_token", _this.data.auth_token).attach("file", data.image).end(function (response) {
      console.log(response.body);
      next(null, response.body);
    });
  };

  this.put = function (endpoint, data, next) {
    var url = _this.data.baseURL[env || "prod"] + endpoint;
    data.auth_token = _this.data.auth_token || data.auth_token;
    console.log("api put...");
    unirest.put(url).header("Accept", "application/json").send(data).end(function (response) {
      console.log(response.body);
      next(null, response.body);
    });
  };
};
apiClient.prototype.initPubnub = function () {
  this.pn.init({
    publish_key: this.data.pubnub_pub_key,
    subscribe_key: this.data.pubnub_sub_key,
    auth_key: this.data.pubnub_auth_key
  });
  console.log("PUBNUB initialized.");
};

apiClient.prototype.connectServer = function () {
  var _this = this;
  this.pn.sub(this.data.channel_uuid, function (msg) {
    console.log(msg);
    switch (msg.type) {
      case "001":
        //new logins from subscribtion
        console.log(_this.data.subscribe_list.items.find({ uuid: msg.uuid }).moments);
        console.log(_this.data.subscribe_list.items.find({ uuid: msg.uuid }));
        _this.data.subscribe_list.items.find({ uuid: msg.uuid }).moments.push({
          image_url: msg.image_url,
          status: msg.status });

        break;
      case "002":
        break;
      case "003":
        break;
    };
  });
  console.log("Connecting server...");
};
apiClient.prototype.backup = function () {
  console.log("Soving some device info to server...");
};
apiClient.prototype.pokeServer = function () {
  this.pn.pub(this.data.channel_uuid);
  console.log("Poking server...");
};

/***************
**  LOGIN UI  **
 ***************/

function LoginUI(apiClient) {
  this.api = apiClient;
  this.photo = "";
  this.status = "";

  this.init_moment = function (photo, next) {
    var _this = this;
    console.log("init_moment...");
    this.photo = photo;
    this.api.postMulti("/moment", { image: photo || "./img.jpg" }, function (err, response) {
      console.log(response);
      console.log("Update device info.");
      _this.api.data.auth_token = response.new_auth_token;
      _this.api.data.uuid = response.uuid;
      if (next) {
        next();
      } else {
        console.log("Subscribing to server...");
        _this.api.connectServer();
      }
    });
  };

  this.submit_moment = function (status, next) {
    var _this = this;


    this.status = status || "yo";
    this.api.put("/moment", { status: status }, function (err, response) {
      console.log("submit_moment...");
      if (!next) {
        console.log(response);
      }
      if (!response.explore_list) {
        if (next) next("err");
      } else {
        _this.api.data.explore_list.rePopulate(response.explore_list, function () {
          console.log("populating explore...");
          if (next) next();
        });
      }
    });
  };
};

/****************************
**  moment list data type  **
 ****************************/

function moment_list() {
  this.items = array();
}

moment_list.prototype.rePopulate = function (info_list, next) {
  var _this = this;
  console.log("populate list itmes...");
  //console.log(info_list);
  this.items = array();
  async.eachSeries(info_list, function (i, next) {
    _this.items.push({
      uuid: i.uuid,
      image_url: i.image_url,
      distance: i.distance,
      status: i.status,
      action_token: i.action_token
    });
    next();
  }, function (err) {
    next();
  });
};



/*****************
**  EXPLORE UI  **
 *****************/

function ExploreUI(apiClient) {
  var _this = this;
  this.api = apiClient;
  this.api.data.explore_list.subscribe = function (index, next) {
    console.log("substribing to explore item: " + index);
    var item = _this.api.data.explore_list.items[index];
    _this.api.post("/moment/action", { action_token: item.action_token.subscribe }, function (response) {
      _this.api.data.subscribe_list.addItem(item);
    });
  };
  this.nextPage = function () {
    console.log("[POST api/explore/nextPage]");
    return this;
  };
  this.refresh = function (next) {
    var _this2 = this;
    this.api.post("/moment/explore", { auth_token: "" }, function (err, response) {
      _this2.api.data.explore_list.rePopulate(response.explore_list, function () {
        console.log("Refresh explore list...");
        console.log(_this2.api.data);
        next();
      });
    });
  };
}; //eof


/*******************
**  SUBSCRIBE UI  **
********************/

function SubscribeUI(apiClient) {
  var _this = this;
  this.api = apiClient;
  this.api.data.subscribe_list.addItem = function (item) {
    console.log("Adding " + item.status + " to subscribe list...");
    _this.api.data.subscribe_list.items.push({
      uuid: item.uuid,
      image_url: item.image_url,
      distance: item.distance,
      status: item.status,
      nickname: "",
      moments: new array()
    });
  };


  this.nextPage = function (data) {
    console.log("api call to subscriber nextPage");
    return this;
  };
  this.refresh = function (data) {
    console.log("api call to subscriber refresh");
    return tihs;
  };
}; //eof


/***************
**  MAIN APP  **
****************/

function App(params, next) {
  this.data = {
    location: { lat: 20, lon: 11 },
    auth_token: "",
    pubnub_pub_key: "demo", //'pub-c-59368519-7ab7-4419-afc0-6ed2cfa0b43d',
    pubnub_sub_key: "demo", //'sub-c-6f5b3a4a-a4ad-11e4-a9d4-02ee2ddab7fe',
    pubnub_auth_key: "",
    channel_uuid: "",
    baseURL: {
      local: "http://127.0.0.1:8000/api",
      prod: "http://glimpse-prod-env-a22zhqiyzs.elasticbeanstalk.com/api"
    },
    login_status: true,

    subscribe_list: new moment_list(),
    explore_list: new moment_list(),
    chat_list: [],
    self_list: []
  };
  this.api = new apiClient(this.data, params.env || "prod");

  this.control = {
    login: new LoginUI(this.api),
    explore: new ExploreUI(this.api),
    subscriber: new SubscribeUI(this.api) };
  this.init = function (next) {
    var _this = this;


    this.api.post("/device", {
      auth_token: "new"
    }, function (err, params) {
      _this.data.auth_token = params.auth_token;
      _this.data.pubnub_auth_key = params.pubnub_key;
      _this.data.channel_uuid = params.uuid;
      _this.data.login_status = params.relogin;
      _this.api.initPubnub();
      _this.api.connectServer();

      if (next) next();
    });
  };
  this.init(next);
}

App.prototype.move = function () {
  this.data.location.lat += 1;
  this.data.location.lon += 1;
};
App.prototype.login = function (status, image, location) {
  var _this = this;
  this.data.location = location || this.data.location;
  this.control.login.init_moment(image, function () {
    setTimeout(function () {
      _this.control.login.submit_moment(status, function () {
        return console.log(_this);
      });
    }, 1000);
  });
};
App.prototype.v_exp = function () {
  var _this = this;
  this.control.explore.refresh(function () {
    return console.log(_this.data.explore_list.items);
  });
};
App.prototype.sub = function (index) {
  this.data.explore_list.subscribe(index, function (item) {
    console.log(response);
  });
};
App.prototype.v_sub = function () {
  this.control.subscriber.refresh();
};
App.prototype.v_info = function () {
  this.api.post("/device/info", {}, function (device) {
    console.log(device);
  });
};

var a;
a = new App({ env: "local" }, function () {
  console.log(a);
});

return App;
//a.login('mc','./img.jpg')
//timestamp:Date.now()