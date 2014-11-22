var app = require('../api').app;
var nconf = require('nconf');
var request = require('supertest');
var expect = require('expect.js');
var should = require('should');
var url = request('http://localhost:5050/api');
var port = 5050;
var LOG = require('../api/service/util').logger;
var ACTOR = require('../api/actor');
var DEVICE = require('../api/device/deModel');
var MOMENT = require('../api/moment/moModel');
var AUTH = require('../api/service/auth');
var mongoose = require('../api').db;
var mockDevice = require('./mock/actor_mock');
var pubnubMock = require('./unit/pubnub_unit_test');
LOG.transports.console.level = 'error';
//app.listen(port);

var device_routing= function() {


  before(function(done)
  {
      setTimeout(function()
              {
                done();
              },1000);
  });
  after(function(done)
    {
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
                      },1500);
            });

        });

    });

  describe('/api/device', function() {


    var mockDevice = {};
    before(function(done)
    {
      done();
    })

    describe('#case 1: new device', function() {



        before(function(done)
        {
          done();
        })
        //input valid, token valid, device found, moment found & vali
        it('should return 201 and new token',function(done)
        {
          this.timeout(18000);
          request(app).post('/api/device')
          .send({
            auth_token:'new'
          })
          .expect(201)//accepted
          .end(function(err, res)
          {
            //if (err) throw err;
            console.log(res.body);
            expect(res.body).to.include.keys('auth_token');
            expect(res.body).to.include.keys('relogin');
            expect(res.body).to.include.keys('pubnub_key');
            expect(res.body).to.include.keys('uuid');
            res.body.relogin.should.equal(true);

            mockDevice.auth_token = res.body.auth_token;
            mockDevice.relogin = res.body.relogin;
            mockDevice.pubnub_key = res.body.pubnub_key;
            mockDevice.uuid = res.body.uuid;


            setTimeout(function() {
              AUTH.verifyToken('auth', mockDevice.auth_token, function( err, payload)
                {
                    mockDevice.device_id = payload.device_id;
                    expect(payload).to.include.keys('device_id');
                    expect(payload).to.include.keys('actor_id');

                    done();

                });
            },3000);


          });

        });

        it('new token should be able to access endpoints',function(done)
        {

          request(app).post('/api/device')
          .send({
            auth_token:mockDevice.auth_token
          })
          .expect(200)
          .end(function(err, res)
          {
            //if (err) throw err;
            res.body.relogin.should.equal(true);
            expect(res.body).to.include.keys('auth_token');
            expect(res.body).to.include.keys('relogin');
            expect(res.body).to.include.keys('pubnub_key');
            expect(res.body).to.include.keys('uuid');

            done();
          });

        });

          it('should recieve server sent message on pubnub channel',function(done)
          {
            pubnubMock.checkServer(done,mockDevice.device_id,mockDevice.pubnub_key);
          });



    });
    describe('#case 2: valid input, device not found', function() {

        before(function(done)
        {
          done();
        })
        //input valid, token valid, device found, moment found & vali
        it('should return 404',function(done)
        {
          request(app).post('/api/device')
          .send({
            auth_token:'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkZXZpY2VfaWQiOiIxNTAzNTJmOS02ZmQwLTQ0YmMtOTc5Zi00Y2RjMzJmYzA2YTQiLCJhY3Rvcl9pZCI6IjZhNmY2NTgxLWM5OGEtNGYyNC1hM2RkLTk0MmE1ODEyOGE5OSIsImlhdCI6MTQxNjQ2ODk1NH0.kHt375QCdgAD7czZXgMYwv2LRvcZnnyYRDPtd0o_YS4'
          })
          .expect(404)
          .end(function(err, res)
          {
            //if (err) throw err;
            done();
          });


        });


    });
    describe('#case 3: invalid auth', function() {

        before(function(done)
        {
          done();
        })
        //input valid, token valid, device found, moment found & vali
        it('should return 404',function(done)
        {
          request(app).post('/api/device')
          .send({
            auth_token:'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkZXZpY2VfaWQiOiIxNTAzNTJmOS02ZmQwLTQ0YmMtOTc5Zi00Y2RjMzJmYzA2YTQiLCJhY3Rvcl9pZCI6IjZhNmY2NTgxLWM5OGEtNGYyNC1hM2RkLTk0MmE1ODEyOGE5OSIsImlhdCI6MTQxNjQ2ODk1NH0.kHt375QCdgAD7czZXgMYwv2PRvcZnnyYRDPtd0o_YS4'
          })
          .expect(401)//accepted
          .end(function(err, res)
          {
            done();
          });


        });


    });


  });
};

module.exports ={device_routing:device_routing};