var app = require('../api').app;
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
var mockDevice = require('./mock/actor_mock');
var pubnubMock = require('./unit/pubnub_unit_test');
LOG.transports.console.level = 'error';
//app.listen(port);
describe('Routing', function() {

  before(function(done) {
    done();
  });
  after(function(done)
    {

       mongoose.connection.db.executeDbCommand( {dropDatabase:1}, function(err, result) {
          console.log(err);
          console.log(result);
          done();
        });

    });
  describe('/api/device', function() {

    //var mockDecive = new mockDevice({did:'',channel_uuid:'',pubnub_key:'',moments:[],friends:[]});
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

            mockDevice.auth_token = res.body.auth_token;
            mockDevice.relogin = res.body.relogin;
            mockDevice.pubnub_key = res.body.pubnub_key;
            mockDevice.uuid = res.body.uuid;

            res.body.relogin.should.equal(true);
            setTimeout(function() {
              AUTH.verifyToken('auth', mockDevice.auth_token, function( err, payload)
                {
                    should.not.exist(err);
                    mockDevice.device_id = payload.device_id;
                    pubnubMock.checkServer(done,payload.device_id,mockDevice.pubnub_key);

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
          .expect(200)//accepted
          .end(function(err, res)
          {
            //if (err) throw err;
            res.body.relogin.should.equal(true);

            done();
          });

        });

          it('should recieve server sent message on pubnub channel',function(done)
          {

              done();
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
          console.log( 'test' );

          request(app).post('/api/device')
          .send({
            auth_token:'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkZXZpY2VfaWQiOiIxNTAzNTJmOS02ZmQwLTQ0YmMtOTc5Zi00Y2RjMzJmYzA2YTQiLCJhY3Rvcl9pZCI6IjZhNmY2NTgxLWM5OGEtNGYyNC1hM2RkLTk0MmE1ODEyOGE5OSIsImlhdCI6MTQxNjQ2ODk1NH0.kHt375QCdgAD7czZXgMYwv2LRvcZnnyYRDPtd0o_YS4'
          })
          .expect(404)//accepted
          .end(function(err, res)
          {
            //if (err) throw err;
            console.log(res.body);



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
          console.log( 'test' );

          request(app).post('/api/device')
          .send({
            auth_token:'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkZXZpY2VfaWQiOiIxNTAzNTJmOS02ZmQwLTQ0YmMtOTc5Zi00Y2RjMzJmYzA2YTQiLCJhY3Rvcl9pZCI6IjZhNmY2NTgxLWM5OGEtNGYyNC1hM2RkLTk0MmE1ODEyOGE5OSIsImlhdCI6MTQxNjQ2ODk1NH0.kHt375QCdgAD7czZXgMYwv2PRvcZnnyYRDPtd0o_YS4'
          })
          .expect(401)//accepted
          .end(function(err, res)
          {
            //if (err) throw err;
            console.log(res.body);



            done();
          });


        });


    });


  });
});