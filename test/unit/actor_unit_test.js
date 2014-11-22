var app = require('../../api').app;

var sinon = require('sinon');
var expect = require('expect.js');
var should = require('should');
var async = require('async');
var request = require('supertest');

var mongoose = require('mongoose');
var mockgoose = require('mockgoose');
//mockgoose(mongoose);

var express = require('express');

var PUBNUB = require('../../api/service/pubnub');
var DEVICE = require('../../api/device/deModel');
var MOMENT = require('../../api/moment/moModel');
var ACTOR = require('../../api/actor');

var AUTH = require('../../api/service/auth');

var momentController = require('../../api/moment/moControl');

var routeValidator = require('../../api/service/util').validator.route;
var tokenValidator = require('../../api/service/util').validator.token;

var nconf = require('nconf');
nconf.argv().env().file({file:__dirname + '/../../api/config.json' });
var uuid = require('node-uuid');
var LOG = require('../../api/service/util').logger;
LOG.transports.console.level = 'error';



var actor_id = uuid.v4();
var device_id = uuid.v4();
var pubnub_key = uuid.v4();
var location = [7,7];
var mock = {
        device:{
            device_id:device_id,
            pubnub_key:pubnub_key,
        },
        moment:{
            fresh:{
                actor_id:actor_id,
                device_id:device_id,
                status: 'fresh moment',
                pubnub_key:pubnub_key,
                location:location,
            },
            expired:{
                actor_id:uuid.v4(),
                device_id:device_id,
                status: 'old moment',
                pubnub_key:pubnub_key,
                expired: true,
                location:location
            }
        }
    };

var mockActor = require('../mock/actor_mock');

var actor_unit_test = function() {

        before(function(done)
          {
              setTimeout(function()
                      {
                        done();
                      },1000);
          });


        describe('.getActor', function() {
            var a = new mockActor({health:'completed'});
            var b = new mockActor({health:'completed'});
            var c = new mockActor({health:'completed'});
            before(function(done)
                {
                    a.addRelation(b, 'like', 0);//b liked a
                    //a.addConnection({channel_id:'a_b'}, b);
                    a.model.save();
                    b.model.save();
                    this.timeout(10000);
                      ['a','b','c','d','e','f','g','h','i','j','k'].forEach(function(name) {
                        var lat = Math.floor((Math.random() * 10) + 1);
                        var lon = Math.floor((Math.random() * 10) + 1);
                        var mo = new MOMENT({actor_id:name, device_id:name, status:name, image_url:'img',location:[lat,lon]})
                        mo.save();
                      });
                      setTimeout(function()
                      {
                        done();
                      },1500);

                });
            it('middleware should pass actor to req',
                function(done)
                {
                    var req = {
                        body:{
                            auth_token:{
                                actor_id:a.model.actor_id,
                                device_id:a.model.device_id
                            }
                        }
                    };
                    var res = {
                        status: function (status) {
                            return {
                                json:function(content){should.not.exist(content)}
                            };
                        }
                    };
                    ACTOR.getActor(req,res,
                        function()
                        {
                            should.exist(req.body.resource_actor);
                            req.body.resource_actor.actor_id.should.equal(a.model.actor_id);
                            done();
                        });
                });
            });


        describe('.createPending', function() {
            var mock_actor = {
                        actor_id:uuid.v4(),
                        device_id:uuid.v4(),
                        health:'pending'
                    };
            before(function(done)
                {
                    var d = new DEVICE({device_id:mock_actor.device_id,pubnub_key:uuid.v4()});
                    d.save(done);
                });
            it('should have fresh explore, new actor_id, and health is pending ',
                function(done)
                {
                    LOG.error('mock_actor.device_id');
                    LOG.error(mock_actor.device_id);
                    ACTOR.createPending({
                            auth_token:{device_id:mock_actor.device_id ,actor_id:mock_actor.actor_id},
                            lat:13,
                            lon:9.5
                       },
                       function(actor)
                       {
                            LOG.error('actor');
                            actor.save();

                            console.log('actor');
                            setTimeout(function(){
                                    ACTOR.findOne({actor_id:mock_actor.actor_id},function(err,moment)
                                    {
                                        if(err)throw err;
                                        console.log(moment);

                                        done();
                                    });
                                },500);
                       });
                });
            });
        describe('.getRelation', function() {
            var a = new mockActor({health:'completed'});
            var b = new mockActor({health:'completed'});
            before(function(done)
                {
                    a.addRelation(b, 'like', 1);//b liked a
                    a.model.save();
                    b.model.save(done);
                });

            it('should return relation if exist',
                function(done)
                {

                    ACTOR.getRelation(b.model.actor_id, a.model.actor_id, function(err, obj)
                        {
                            expect(obj[0].relation[0].actor_id).to.equal(b.model.actor_id);
                            done();
                        });

                });
            });
        describe('.saveConnection', function() {
            var a = new mockActor({health:'completed'});
            var b = new mockActor({health:'completed'});
            var c = new mockActor({health:'completed'});
            before(function(done)
                {
                    a.addRelation(b, 'like', 0);//b liked a
                    //a.addConnection({channel_id:'a_b'}, b);
                    a.model.save();
                    b.model.save(done);
                });
            it('should add connection and pull relation',
                function(done)
                {
                    a.model.saveConnection({
                        target_aid:b.model.actor_id,
                        channel_id:'a_b',
                        type:'like',
                    },function(err, num, obj)
                        {
                            LOG.info(obj);
                            LOG.info(num);
                            mongoose.model('Actor').find({actor_id:a.model.actor_id},function(err,obj)
                            {
                                LOG.info(obj);
                                expect(obj[0].connection[0].actor_id).to.equal(b.model.actor_id);
                                expect(obj[0].connection[0].channel_id).to.equal('a_b');
                                should.not.exist(obj[0].relation[0]);
                                done();
                            });
                            //expect(obj.connection[0].actior_id).to.equal(b.model.actor_id);

                        });


                });

        });
        describe('.saveRemoteConnection', function() {
            var a = new mockActor({health:'completed'});
            var b = new mockActor({health:'completed'});
            var c = new mockActor({health:'completed'});
            before(function(done)
                {
                    a.addRelation(b, 'like', 0);//b liked a
                    //a.addConnection({channel_id:'a_b'}, b);
                    a.model.save();
                    c.model.save();
                    b.model.save(done);
                });
            it('should return connection if exist',
                function(done)
                {

                    ACTOR.saveRemoteConnection({
                        target_aid:     c.model.actor_id,
                        owner_aid:      a.model.actor_id,
                        channel_id:     'a_c',
                    },function(err, obj)
                        {
                            LOG.info(obj);

                            mongoose.model('Actor').find({actor_id:c.model.actor_id},function(err,obj)
                            {
                                LOG.info(obj);
                                expect(obj[0].connection[0].actor_id).to.equal(a.model.actor_id);
                                expect(obj[0].connection[0].channel_id).to.equal('a_c');

                                done();
                            });
                            //expect(obj.connection[0].actior_id).to.equal(b.model.actor_id);

                        });
                });
        });
        describe('.addRemoteRelation', function() {
            var a = new mockActor({health:'completed'});
            var b = new mockActor({health:'completed'});
            var c = new mockActor({health:'completed'});
            before(function(done)
                {
                    //a.addRelation(b, 'like', 0);//b liked a
                    //a.addConnection({channel_id:'a_b'}, b);
                    a.model.save();
                    c.model.save();
                    b.model.save(done);
                });
            it('should return relation if exist',
                function(done)
                {

                    ACTOR.addRemoteRelation({
                        target_aid:b.model.actor_id,
                        owner_aid:a.model.actor_id,
                        status:0,
                        type:'like',
                    },function(err, num, obj)
                        {
                            LOG.info(err);

                            setTimeout(function()
                              {

                                mongoose.model('Actor').find({actor_id:b.model.actor_id},function(err,obj)
                                {
                                    LOG.info(obj);
                                    expect(obj[0].relation[0].actor_id).to.eql(a.model.actor_id);
                                    expect(obj[0].relation[0].type).to.eql('like');
                                    expect(obj[0].relation[0].status).to.eql(0);

                                    done();
                                });

                              },1000);
                        });

                });
        });


    };

module.exports = actor_unit_test;