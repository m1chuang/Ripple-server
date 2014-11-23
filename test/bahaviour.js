var app = require('../api').app;

var async = require( 'async' );
var nconf = require('nconf');
var request = require('supertest');
var expect = require('expect.js');
var should = require('should');
var url = request('http://localhost:5050/api');
var port = 5050;
var LOG = require('../api/service/util').logger;
var ACTOR = require('../api/actor');
var AUTH = require('../api/service/auth');
var mongoose = require('../api').db;
var mockActor = require('./mock/actor_mock');
var pubnubMock = require('./unit/pubnub_unit_test');
var DEVICE = require('../api/device/deModel');
var MOMENT = require('../api/moment/moModel');
var uuid = require('node-uuid');
//LOG.transports.console.level = 'error';
//app.listen(port);


var behaviour= function() {

  after(function(done)
  {
     setTimeout(function()
                      {
                        done();
                      },1500);

  });
  before(function(done)
    {
      this.timeout(10000);
      mongoose.connection.collections['actors'].drop( function(err) {
            console.log('collection dropped');
            ACTOR.ensureIndexes(function(){
              console.log('Index ensured');
            });
        });
        mongoose.connection.collections['devices'].drop( function(err) {
            console.log('collection dropped');
            DEVICE.ensureIndexes(function(){
              console.log('Index ensured');
            });
        });
        mongoose.connection.collections['moments'].drop( function(err) {
            console.log('collection dropped');
            MOMENT.ensureIndexes(function(){
              console.log('Index ensured');
               setTimeout(function()
                      {
                        done();
                      },2500);
            });

        });
  });
  describe('/api/moment/', function() {

    var user_list = ['a','b','c','d','e','f','g','h','i','j','k'];
    var mockUser = {};
    //actor.status = \'completed\', actor.relation[target_aid] found, actor.relation[target_aid].status = '1' //liked by target
    describe('init and complete moment',function()
    {
       before(function(done)
        {
          this.timeout(25000);
          async.map( ['a','b','c','d','e','f','g','h','i','j','k','michael'],
            function(name, next)
            {
              request(app).post('/api/device')
              .send({
                auth_token:'new'
              })
              .expect(201)//accepted
              .end(function(err, res)
              {

                mockUser[name] = {
                  auth_token: res.body.auth_token,
                  relogin: res.body.relogin,
                  pubnub_key: res.body.pubnub_key,
                  uuid: res.body.uuid,
                  id:name
                };
                expect(res.body).to.include.keys('auth_token');
                expect(res.body).to.include.keys('relogin');
                expect(res.body).to.include.keys('pubnub_key');
                expect(res.body).to.include.keys('uuid');
                next( null );
              });

            },
            function ( err, list )
              {

                done();
              });
        });

      it('user pool one init moments',function(done)
      {


          //LOG.info(mockUser);
          this.timeout(20000);
          async.map( user_list,
            function(name, next)
            {
              console.log(mockUser[name].auth_token);
              var lat = Math.floor((Math.random() * 10) + 1);
              var lon = Math.floor((Math.random() * 10) + 1);
              setTimeout(function() {
                request(app).post('/api/moment')
                .attach('image',__dirname +'/image.jpg')
                .field('auth_token',mockUser[name].auth_token)
                .field('lat',lat)
                .field('lon',lon)
                //.expect(202)//accepted
                .end(function(err, res)
                {
                  var new_auth = res.body.new_auth_token;
                  console.log(res.body);
                  mockUser[name].auth_token= new_auth;
                  setTimeout(function() {
                    request(app).put('/api/moment')
                    .send({
                      auth_token:new_auth,
                      status:'i am '+name,
                      lat:lat,
                      lon:lon
                    })
                    //.expect(202)//accepted
                    .end(function(err, res)
                    {
                      //expect(res.body).to.include.keys('explore_list');
                      console.log(res.body);
                      mockUser[name].explore_list= res.body.explore_list;
                      mockUser[name].status = 'i am '+name;
                      next( null );
                    });
                    },1500);

                  });
              },1000);
            },
            function ( err, list )
              {

                done();
              });


      });

    it('michael complete moment and get explore list',function(done)
      {

        var lat = Math.floor((Math.random() * 10) + 1);
        var lon = Math.floor((Math.random() * 10) + 1);
        request(app).post('/api/moment')
        .attach('image',__dirname +'/image.jpg')
        .field('auth_token',mockUser.michael.auth_token)
        .field('lat',lat)
        .field('lon',lon)
        .expect(202)//accepted
        .end(function(err, res)
        {
          var new_auth = res.body.new_auth_token;
          console.log(res.body);
          mockUser.michael.auth_token= new_auth;

          setTimeout(function() {
            request(app).put('/api/moment')
            .send({
              auth_token:new_auth,
              status:'i am michael',
              lat:lat,
              lon:lon
            })
            .expect(201)//accepted
            .end(function(err, res)
            {
              expect(res.body).to.include.keys('explore_list');
              console.log(res.body);
              mockUser.michael.explore_list= res.body.explore_list;
              done();
            });
          },1000);

          });

      });





      it('user pool update explore list',function(done)
      {


          //LOG.info(mockUser);
          this.timeout(20000);
          async.map( user_list,
            function(name, next)
            {
              console.log(mockUser[name].auth_token);

              setTimeout(function() {
                request(app).post('/api/moment/explore')
                .send({
                      auth_token:mockUser[name].auth_token,
                      offset:0,
                      limit:10,
                    })
                    //.expect(202)//accepted
                .end(function(err, res)
                    {
                      //expect(res.body).to.include.keys('explore_list');
                      console.log(res.body);
                      mockUser[name].explore_list= res.body.explore_list;
                      next(null);
                });
              },1000);

            },
            function ( err, list )
              {

                done();
              });


      });

     it('michael likes target, should init like',function(done)
          {


                  console.log(mockUser);
              request(app).post('/api/moment/action')
              .send({
                auth_token:mockUser.michael.auth_token,
                action_token:mockUser.michael.explore_list[0].action_token.like
              })
              //.expect(202)//accepted
              .end(function(err, res)
              {

                console.log(res.body);
                done();

                });


      });

      it('target likes michael, should connect',function(done)
          {
            var target;
            var michael_action;
            for(var m in mockUser)
            {
              console.log(mockUser[m]);
              if(mockUser[m].status === mockUser.michael.explore_list[0].status)
              {
                target = m;
                console.log(target);
              }
            }

            setTimeout(function() {
              console.log(target);
              for(var e in mockUser[target].explore_list)
              {
                console.log(mockUser[target].explore_list[e]);
                if(mockUser[target].explore_list[e].status === 'i am michael')
                {
                  michael_action = mockUser[target].explore_list[e].action_token.like;
                }
              }
            },300);

            setTimeout(function() {
              request(app).post('/api/moment/action')
              .send({
                auth_token:mockUser[target].auth_token,
                action_token:michael_action
              })
              //.expect(202)//accepted
              .end(function(err, res)
              {

                console.log(res.body);
                done();

                });
              },1000);

      });

      it('michael like target again, should return already friend',function(done){
            console.log(mockUser);
            request(app).post('/api/moment/action')
            .send({
                auth_token:mockUser.michael.auth_token,
                action_token:mockUser.michael.explore_list[0].action_token.like
            })
            .expect(200)//accepted
            .end(function(err, res)
              {
                console.log('///////////$');
                console.log(res.body);
                done();

              });
      });

      it('michael relogin',function(done){
        request(app).post('/api/device')
          .send({
            auth_token:mockUser.michael.auth_token
          })
          .expect(201)//accepted
          .end(function(err, res)
          {
            console.log('////////uuuuu///$');
            console.log(res.body);
            //expect(res.body.relogin).to.equal(false);
            var lat = Math.floor((Math.random() * 10) + 1);
            var lon = Math.floor((Math.random() * 10) + 1);
            request(app).post('/api/moment')
            .attach('image',__dirname +'/image.jpg')
            .field('auth_token',mockUser.michael.auth_token)
            .field('lat',lat)
            .field('lon',lon)
            .expect(202)//accepted
            .end(function(err, res)
            {
              var new_auth = res.body.new_auth_token;
              console.log(res.body);
              mockUser.michael.auth_token= new_auth;

              setTimeout(function() {
                request(app).put('/api/moment')
                .send({
                  auth_token:new_auth,
                  status:'i am michael2',
                  lat:lat,
                  lon:lon
                })
                .expect(201)//accepted
                .end(function(err, res)
                {
                  expect(res.body).to.include.keys('explore_list');

                  mockUser.michael.explore_list= res.body.explore_list;
                  done();
                });
              },1000);

            });

          });

        });


    });
  });//end /moment/
};

describe('behaviour',behaviour);
