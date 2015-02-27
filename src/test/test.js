var app = require('../api');

var nconf = require('nconf');
nconf.argv().env().file({file:__dirname + '/../api/config.json' });


var expect = require('expect.js');
var should = require('should');
var async = require('async');
var request = require('supertest');

var mongoose = app.db;//require('mongoose');
//var connection = mongoose.createConnection( nconf.get('database')['local-test'] );
//var mockgoose = require('mockgoose');
//mockgoose(mongoose);

//var express = require('express');

var PUBNUB = require('../api/service/pubnub');
var DEVICE = require('../api/device/deModel');
var MOMENT = require('../api/moment/moModel');
var ACTOR = require('../api/actor');

var AUTH = require('../api/service/auth');

var momentController = require('../api/moment/moControl');

var routeValidator = require('../api/service/util').validator.route;
var action_tokenValidator = require('../api/service/util').validator.action_token;



var request = request('http://localhost:5050/api');

var uuid = require('node-uuid');

var port = 5050;
var LOG = require('../api/service/util').logger;
LOG.transports.console.level = 'error';

//app.listen(port);

/*global it,describe,before */
describe('Unit testing', function() {

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

    describe('Service', function()
    {
    //auth
        describe('AUTH', function()
        {
            describe('.newAuthToken .verifyToken', function()
            {
                var token = {
                    device_id:uuid.v4(),
                    actor_id:'oldActorId',
                };
                it('token with new actor_id should be valid',
                    function(done)
                        {
                            AUTH.newAuthToken( token, true,
                                function( newToken )
                                {
                                    AUTH.verifyToken('auth', newToken, function( err, payload)
                                    {
                                        should.not.exist(err);
                                        payload.actor_id.should.not.equal('oldActorId');
                                        done();
                                    });
                                });
                        });
                it('token with old actor_id should be valid',
                    function(done)
                        {
                            AUTH.newAuthToken( token, false,
                                function( newToken )
                                {
                                    AUTH.verifyToken('auth', newToken, function( err, payload)
                                    {
                                        should.not.exist(err);
                                        payload.actor_id.should.equal('oldActorId');
                                        done();
                                    });
                                });
                        });
                it('invalid token should not be valid',
                    function(done)
                        {
                            AUTH.newAuthToken( token, false,
                                function( newToken )
                                {
                                    AUTH.verifyToken('auth', newToken+'t', function( err, payload)
                                    {
                                        should.exist(err);
                                        done();
                                    });
                                });
                        });
                //token generated with server_jwt_key should be verifyable
            });

        describe('.IssueActionToken .parseAction', function()
            {
                var mock_token = {
                    plain: {
                        target_info:{
                            aid:uuid.v4(),
                            did:uuid.v4(),
                            distance:10
                        }},
                    encrypted:{}
                };
                before(function(done)
                {
                    AUTH.issueActionToken( 'like',mock_token.plain,
                        function( newToken )
                        {
                            mock_token.encrypted = newToken;
                            done();
                        });
                });

                it('action token should be encrypted',
                    function(done)
                        {
                            AUTH.issueActionToken( 'like','token',
                                function( newToken )
                                {
                                    expect(newToken).to.not.equal('text');
                                    done();
                                });
                        });
                it('action token can be decrypted ',
                    function(done)
                        {
                            var req ={
                                    body:{
                                        action_token:mock_token.encrypted
                                    }
                                };
                            AUTH.parseAction(req, {},
                                function( )
                                {

                                    expect(req.body.action_token).to.eql(mock_token.plain);
                                    done();
                                });

                        });
                it('400 error sent for action with incorrect schema',
                    function(done)
                        {
                            var req ={
                                    body:{
                                        action_token:{
                                            type:'like',
                                            target_info:{
                                                distance:10
                                            }
                                        }
                                    }
                                };
                            var res = {
                                status: function (status) {
                                    return {
                                        json: function(content)
                                        {
                                            expect(status).to.equal(400);
                                            done();
                                        }
                                    }

                                }
                            };
                            action_tokenValidator(req, res,
                                function( ){});
                        });

            });




    });




        describe('PUBNUB', function()
        {
            var client_auth_key = uuid.v4();
            var server_channel = uuid.v4();

            before(function(done)
                {
                    PUBNUB.createServerConnection( server_channel, client_auth_key,
                        function()
                        {
                            done();
                        });
                });

            describe('.createServerConnection', function()
            {

                it('server channel should be granted to device, with device.pubnub_key',
                    function(done)
                    {
                        done();
                    });
                it('server channel should be blocked to unintended device',
                    function(done)
                    {
                       done();
                    });



            });

            describe('.create chat connection', function() {

                it('cerate chat connection',
                    function(done)
                        {
                            done();
                    });



            });
        });
    });

        var moment_unit_test = require('./unit/moment_unit_test');
        var actor_unit_test = require('./unit/actor_unit_test');
        describe('Actor', actor_unit_test);
        describe('Moment', moment_unit_test);
        describe('Device', function() {
            var mock_device = new DEVICE(mock.device);
            before(function(done)
            {
                done();
            });


            /* unit testing */
            describe('get device', function() {
                it('got device',
                function(done)
                    {
                        done();
                    });
            //get device by did

            });

            describe('create device', function()
            {
                it('create device',
                function(done)
                    {
                        done();
                    });
                //create device

            });

            describe('.saveFriend', function() {
                it('saveFriend',
                function(done)
                    {
                        done();
                    });
                //save to device

            });

        });



    });
describe('Device Endpoints testing', require('./api.device.test').device_routing);
describe('Moment Endpoints testing', require('./api.moment.test').moment_routing);
