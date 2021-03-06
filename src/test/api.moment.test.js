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
var mockActor = require('./mock/actor_mock');
var pubnubMock = require('./unit/pubnub_unit_test');
var DEVICE = require('../api/device/deModel');
var MOMENT = require('../api/moment/moModel');
var uuid = require('node-uuid');
LOG.transports.console.level = 'error';
//app.listen(port);


  function in_list_deep(list,str) {
    for (var x in list) {
        if (JSON.stringify(list[x]) === JSON.stringify(str)) return true;
    }
    return false;
 }
var moment_routing= function() {

  before(function(done)
  {
      setTimeout(function()
              {
                done();
              },1000);
  });
  after(function(done)
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
                      },1500);
            });

        });

    });


  describe('/api/moment/', function() {

    var mockDevice = {};
    //actor.status = \'completed\', actor.relation[target_aid] found, actor.relation[target_aid].status = '1' //liked by target
    describe('init and complete moment',function()
    {
       before(function(done)
        {
          this.timeout(10000);
          ['a','b','c','d','e','f','g','h','i','j','k'].forEach(function(name) {
            var lat = Math.floor((Math.random() * 10) + 1);
            var lon = Math.floor((Math.random() * 10) + 1);
            var mo = new MOMENT({actor_id:name, device_id:name, status:name, image_url:'img',location:[lat,lon]})
            mo.save();
          });

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
            done();
          });
        });

      it('on init, if auth_token valid, return new auth_token',function(done)
      {
        this.timeout(10000);
        request(app).post('/api/moment')
        .attach('image',__dirname +'/image.jpg')
        .field('auth_token',mockDevice.auth_token)
        .field('lat',10)
        .field('lon',12)
        .expect(202)//accepted
        .end(function(err, res)
          {
            if (err) throw err;
            expect(res.body).to.include.keys('new_auth_token');
            mockDevice.auth_token = res.body.new_auth_token;
            AUTH.verifyToken('auth', mockDevice.auth_token, function( err, payload)
                {
                    mockDevice.device_id = payload.device_id;
                    expect(payload).to.include.keys('device_id');
                    expect(payload).to.include.keys('actor_id');

                    setTimeout(function()
                      {
                        done();
                      },1000);

                });
          });


      });

      it('on init, should create an actor with health=established',function(done)
      {
        this.timeout(10000);
        setTimeout(function()
          {
            ACTOR.findOne({
                device_id:mockDevice.device_id,
                },
                function(err, obj)
                {
                  mockDevice.actor_id=obj.actor_id;
                  obj.health.should.equal('established');
                  done();
                });
          }, 1500);
      });

      it('on complete, Should return 201 if input and token are valid',function(done)
      {
        request(app).put('/api/moment')
        .send({
          auth_token:mockDevice.auth_token,
          status:'test',
          lat:10,
          lon:12
        })
        .expect(201)//accepted
        .end(function(err, res)
          {
            if (err) throw err;
            res.body.explore_list.length.should.equal(10);
            console.log(res.body.auth_token);
            done();

          });
      });
      it('on complete, Should update actor health to \'completed\'',function(done)
      {
        setTimeout(function()
          {
            ACTOR.findOne({
                device_id:mockDevice.device_id,
                },
                function(err, obj)
                {
                  mockDevice.actor_id=obj.actor_id;
                  obj.health.should.equal('completed');
                  done();
                });

          }, 1500);
      });

      it('upon complete moment, device should not be require to relogin',function(done)
      {

        request(app).post('/api/device')
        .send({
          auth_token:mockDevice.auth_token
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
            res.body.relogin.should.equal(false);
            mockDevice.auth_token = res.body.auth_token;
            mockDevice.relogin = res.body.relogin;
            res.body.pubnub_key.should.equal(mockDevice.pubnub_key);
            res.body.uuid.should.equal(mockDevice.uuid);
            done();
          });
        });



      });




  });//end /moment/


describe('/api/moment/action', function() {

      var b=new mockActor({health:'completed'});
      var a=new mockActor({health:'completed'});
      var c=new mockActor({health:'completed'});
      var d=new mockActor({health:'pending'});
      var e=new mockActor({health:'established'});
      b.model.relation =[
          {
            actor_id:a.model.actor_id,
            type:'like',
            status:1 //already liked a
          }];
      a.model.relation = [
          {
            actor_id:b.model.actor_id,
            type:'like',
            status:0 //liked by b
              },
          {
            actor_id:c.model.actor_id,
            type:'like',
            status:1 //already liked c
          }];
      c.model.relation=[
        {
          actor_id:a.model.actor_id,
          type:'like',
          status:0 //liked by a
        }];



    before(function(done)
    {
      this.timeout(5000);
      a.model.save();
      b.model.save();
      d.model.save();
      c.model.save(function(err)
        {
          LOG.error(err);
          done();
        });
      AUTH.issueActionToken('like',
            {target_info:{aid:b.model.actor_id,distance:10}
            },function(action_token)
            {
              b.action_token = action_token;
            });
      AUTH.issueActionToken('like',
            {target_info:{aid:c.model.actor_id,distance:10}
            },function(action_token)
            {
              c.action_token = action_token;
            });
      AUTH.issueActionToken('like',
            {target_info:{aid:a.model.actor_id,distance:10}
            },function(action_token)
            {
              a.action_token = action_token;

            });
    });



    //actor.status = \'completed\', actor.relation[target_aid] found, actor.relation[target_aid].status = '1' //liked by target
    describe('liked by target',function()
      {
        LOG.info( 'test' );
        var chat_channel_id= '';
        it('Should return 200 with channel_id',function(done)
        {
          request(app).post('/api/moment/action')
          .send({
            auth_token:a.auth_token,
            action_token:b.action_token
          })
          .expect(202)//accepted
          .end(function(err, res)
            {
              if (err) throw err;
              LOG.info(res.body);
              res.body.payload.channel_id.should.exist;
              done();
            });
          });

        it('both party should shared the same channel id in actor.connection',function(done)
          {
          setTimeout(function()
            {
              ACTOR.findOne({
                  actor_id:a.model.actor_id,
                  'connection.actor_id':b.model.actor_id
                },{
                  'connection.$':1
                },
                  function(err, remote)
                  {
                    remote.connection[0].actor_id.should.equal(b.model.actor_id);

                    ACTOR.findOne({
                      actor_id:b.model.actor_id,
                      'connection.actor_id':a.model.actor_id
                    },{
                      'connection.$':1
                    },function(err, obj)
                      {
                        obj.connection[0].actor_id.should.equal(a.model.actor_id);
                        obj.connection[0].channel_id.should.equal(remote.connection[0].channel_id);
                        chat_channel_id = remote.connection[0].channel_id;
                        done();
                      });
                  });
            }, 500);
          });

        it('both party should have read write access to shared chat channel',function(done)
          {
            this.timeout(18000);
            pubnubMock.checkChat(false, chat_channel_id, a.model.pubnub_key, b.model.pubnub_key);
            setTimeout(function()
              {
                pubnubMock.checkChat(done, chat_channel_id, b.model.pubnub_key, a.model.pubnub_key);
              },2500);
          });

      });

    //actor.status = \'completed\', actor.relation[target_aid] found, actor.relation[target_aid].status = '0' //
    it('return 304 if liked this target already',function(done)
    {
      request(app).post('/api/moment/action')
      .send({
        auth_token:a.auth_token,
        action_token:c.action_token
      })
      .expect(304)//not modified
      .end(function(err, res)
      {
        if (err) throw err;
        done();
      });
    });

    describe('Initiate like, waiting to be liked back',function()
    {
      it('should return 201',function(done)
        {
          request(app).post('/api/moment/action')
          .send({
            auth_token:c.auth_token,
            action_token:b.action_token
          })
          .expect(201)//created
          .end(function(err, res)
          {
            if (err) throw err;
            done();
          });
        });
      it('Relation should be added to remote with liked status',function(done)
        {
         setTimeout(function()
              {
                ACTOR.findOne({
                  actor_id:b.model.actor_id,
                  'relation.actor_id':c.model.actor_id
                },{
                  'relation.$':1
                },
                  function(err, obj)
                  {
                    LOG.info('obj');
                    LOG.info(obj);

                    obj.relation[0].actor_id.should.equal(c.model.actor_id);
                    obj.relation[0].status.should.equal(0);
                    done();
                  })
              }, 500);
        });
      it('Relation should be added to self with like status',function(done)
        {
         setTimeout(function()
              {
                ACTOR.findOne({
                  actor_id:c.model.actor_id,
                  'relation.actor_id':b.model.actor_id
                },{
                  'relation.$':1
                },
                  function(err, obj)
                  {
                    LOG.info('obj');
                    LOG.info(obj);
                    LOG.info(err);
                    obj.relation[0].actor_id.should.equal(b.model.actor_id);
                    obj.relation[0].status.should.equal(1);
                    done();
                  })
              }, 500);
        });

    });
    //actor.status = \'completed\', actor.relation[target_aid] not found

    it('return 403 if actor.status not \'completed\'',function(done)
      {
        request(app).post('/api/moment/action')
        .send({
          auth_token:d.auth_token,
          action_token:c.action_token
        })
        .expect(403)
        .end(function(err, res)
        {
          if (err) throw err;
          done();
        });
    });

    it('return 404 if actor not found',function(done)
      {
        request(app).post('/api/moment/action')
        .send({
          auth_token:e.auth_token,
          action_token:a.action_token
        })
        .expect(404)
        .end(function(err, res)
        {
          if (err) throw err;
          done();
        });
    });


    it('return 401 if input valid, token invalid',function(done)
      {
        request(app).post('/api/moment/action')
        .send({
          auth_token:'auth_token',
          action_token:a.action_token
        })
        .expect(401)
        .end(function(err, res)
        {
          if (err) throw err;
          done();
        });
      });

    it('return 400 if input invalid',function(done)
      {
        request(app).post('/api/moment/action')
        .send({
          auth_tokens:'auth_token',
        })
        .expect(400)
        .end(function(err, res)
        {
          if (err) throw err;
          done();
        });
      });


  });

};
module.exports = {moment_routing:moment_routing};