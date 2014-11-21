var app = require('../../api');

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

var moment_unit_test =  function() {

        var locations = [[15,35],[13,37],[16,36],[13,35],[11,31],[8,25],[15,38],[17,35],[15,33],[17,30],[17,30]];
        var names = ['albee', 'katie', 'johanna', 'annie', 'angel', 'lala', 'kazumi', 'apple', 'julia', 'angela', 'apple'];
        var mock_device = new DEVICE(mock.device);
        var mock_moments = [];
        var mock_momnet = new MOMENT(
            {
                 actor_id :      uuid.v4(),
                 device_id :     mock_device.device_id,
                 pubnub_key :    mock_device.pubnub_key,
                 image_url :     'image_url',
                 location :      [15,35],
            });
        before(function(done)
        {
            async.map(names,
                (function (name, cb) {
                    var lat = Math.floor((Math.random() * 10) + 1);
                    var lon = Math.floor((Math.random() * 10) + 1);
                    var mm = new MOMENT(
                        {
                             actor_id :      uuid.v4(),
                             device_id :     uuid.v4(),
                             pubnub_key :    uuid.v4(),
                             status:         name,
                             image_url :     'image_url-'+name,
                             location :      [lat,lon],
                        });

                    mm.save(function () {
                        cb(null, mm);
                    });
                }).bind(this),
                function (err, moments) {
                    mock_moments = moments;
                    done();
                });
            mock_device.save();

        });


        /**
         *  Model
         */
        describe('Model', function() {
            describe('.getExlore', function()
                {

                    it('Expole should have valid action token{target_info:{aid:string, did:string}} and follow schema',
                    function(done)
                        {

                            MOMENT.getExplore({
                                lat : 15,
                                lon : 35
                            },function(err, explore_list)
                            {
                                explore_list.length.should.equal(10);

                                var decryption = JSON.parse(JSON.parse(AUTH.decrypt(explore_list[0].action_token.like)));
                                //LOG.error(decryption);
                                should.exist(decryption.target_info);
                                should.exist(decryption.target_info.aid);
                                should.exist(decryption.target_info.distance);

                                done();
                            });
                        });
                });

            describe('.isFresh', function() {
                var moment_fresh = new MOMENT(mock.moment.fresh);
                var moment_expired = new MOMENT(mock.moment.expired);


                before(function(done)
                    {
                        moment_fresh.save();
                        moment_expired.save();
                        done();

                    });
                it('return true if moment is expired',
                    function(done)
                    {

                        MOMENT.isExpired({
                            actor_id:moment_expired.actor_id
                        },function(status)
                        {
                            status.should.equal(true);
                            done();
                        });

                    });
                it('return false if moment is not yet expired',
                    function(done)
                    {

                        MOMENT.isExpired({
                            actor_id:moment_fresh.actor_id
                        },function(status)
                        {
                            status.should.equal(false);
                            done();
                        });

                    });

                });
        });//end model

        /**
         *  Controller
         */
        describe('Controller', function() {
            describe('.init', function()
                {
                    it('Explore should have valid action token{target_info:{aid:string, did:string}} and follow schema',
                        function(done)
                        {
                            momentController.initMoment(
                                {
                                    device_id : mock_device.device_id,
                                    resource_device : mock_device,
                                    image   : 'image',
                                    lat : 15,
                                    lon : 35
                                });
                            //need to test if th eactor is really added
                            done();
                        });
                });
            describe('.completeMoment', function()
                {
                    var mock_actor = {
                        established: new ACTOR({actor_id:uuid.v4(), device_id:uuid.v4(),pubnub_key:uuid.v4(), health:'established'}),
                        pending: new ACTOR({actor_id:uuid.v4(), device_id:uuid.v4(), health:'pending'})
                    };
                    before(function(done)
                    {
                        mock_actor.established.save();
                        mock_actor.pending.save();
                        done();

                    });


                    it('should create new moment if actor.health =\'established\'',
                        function(done)
                        {
                            momentController.completeMoment(
                                {
                                    resource_actor : mock_actor.established,
                                    status : 'establised moment',
                                    lat : 15,
                                    lon: 35
                                },
                                function(status, msg, explore)
                                {
                                    status.should.equal(201);
                                    msg.should.equal('');
                                    setTimeout(function(){
                                        MOMENT.findOne({actor_id:mock_actor.established.actor_id},function(err,moment)
                                        {
                                            if(err)throw err;
                                            should.exist(moment);
                                            done();
                                        });
                                    },100);

                            });
                            //need to test if th eactor is really added

                        });
                    it('should create pending actor if actor not exist',
                        function(done)
                        {
                            momentController.completeMoment(
                                {
                                    resource_actor : null,
                                    auth_token:{actor_id:mock_actor.pending.actor_id},
                                    status : 'pending moment',
                                    lat : 15,
                                    lon: 35
                                },
                                function(status, msg, explore, newToken)
                                {
                                    status.should.equal(200);
                                    msg.should.equal('Resend image.');
                                    setTimeout(function(){
                                        ACTOR.findOne({actor_id:mock_actor.pending.actor_id},function(err,moment)
                                        {
                                            if(err)throw err;
                                            should.exist(moment);
                                            done();
                                        });
                                    },100);

                                });

                        });
                });

                describe('.doAction', function()
                    {

                        describe('like', function()
                            {

                                var mock_actor = new ACTOR({
                                    actor_id:'doaction_like',
                                    device_id:uuid.v4(),
                                    health:'completed',
                                    explore:[{
                                        actor_id:'albee',
                                        status:'albee yeeee',
                                        action_token:{
                                            like:''
                                        },
                                        distance:10
                                    }],
                                    relation:[{
                                        actor_id:'albee',
                                        status:1,
                                        type:'like',
                                        pubnub_key:uuid.v4(),

                                    }]
                                });
                                var action_token = {
                                    target_info:{
                                                aid:mock_actor.explore[0].actor_id,
                                                distance:mock_actor.explore[0].distance
                                    }};
                                before(function(done)
                                {
                                    mock_actor.save();
                                    AUTH.issueActionToken( 'like',action_token,function(token)
                                        {
                                            mock_actor.explore[0].action_token.like = token;
                                            action_token.target_info.action='like';
                                            done();
                                        });
                                });
                                it('Like action return 200 if success',
                                function(done)
                                    {
                                        done();
                                        /*
                                        var params ={
                                                auth_token : {
                                                    device_id:mock_actor.device_id,
                                                    actor_id:mock_actor.actor_id
                                                },
                                                action_token:action_token.target_info
                                            };
                                        momentController.doAction(params,function(status, payload){
                                            //expect(status).to.equal(200);

                                           done();

                                        });
                                        */

                                    });
                                it('Like action return 403 if unsuccess',
                                function(done)
                                    {

                                        done();

                                    });
                            });
                    });
        });//end controller



    };//end moment

module.exports = moment_unit_test;


