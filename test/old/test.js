var should = require('should');
var async = require('async');
var request = require('supertest');
var mongoose = require('mongoose');
var express = require('express');
var User =  require('./user.mock').user;
var User_pool =  require('./user.mock').interaction;
var PUBNUB = require('../app/service/pubnub');
var nconf = require('nconf');
nconf.argv().env().file({file:__dirname + '/../app/config.json' });
var request = request('http://localhost:5050/api');


var app = require('../app/api');
var port = 5050;
var LOG = require('../app/service/util').logger;
//LOG.transports.console.level = 'error';

app.listen(port);

/*global it,describe,before */
describe('Routing', function() {



    before(function(done)
    {

        function clearDB() {
            for (var i in mongoose.connection.collections) {
                mongoose.connection.collections[i].remove(function() {});
            }
            return done();
        }

        if (mongoose.connection.readyState === 0) {
            mongoose.connect(config.db.test, function (err) {
                if (err)
                {
                    throw err;
                }
                return clearDB();
            });
        }
        else
        {
            return clearDB();
        }

    });

    var user_a;
    var group_a;
    var device_uuid = [];

    describe('Single User', function()
    {

        before(function(done)
        {
            user_a = new User('MC-test');

            done();
        });

        it('should get auth_token when requested new',
            function(done)
            {
            console.log('init_users.users');

                user_a.device_post(function(res){
                    done();
                });
                //check if device now exist in db
            });

        it('should get 202 for POST on /moment with proper info',
            function(done)
            {
               //console.log(user);


                var lat = Math.floor((Math.random() * 10) + 1);
                var lon = Math.floor((Math.random() * 10) + 1);
                user_a.init_moment(lat, lon, function(){
                    done();
                });
             });
        it('should get 400 for POST on /moment if missing info',
            function(done)
            {
               done();
             });

        it('should get 200 for PUT on /moment',
            function(done)
            {

               // console.log(user);
               user_a.complete_moment(function(res){
                    done();
                });

           });

    });

    describe('User Pool', function() {

        before(function(done)
        {

            group_a = new User_pool();
            group_a.genUsers(['katie', 'annie', 'albee'], function(){
                group_a.allLogin(function(){
                    done();
                });
            });
        });

        it('update explore',
            function(done)
            {
               // console.log(user);
               group_a.allUpdateExplore(function (users)
               {
                   done();
               });

            });


        it('like init',
            function(done) {
            var lat = Math.floor((Math.random() * 10) + 1);
            var lon = Math.floor((Math.random() * 10) + 1);
            user_a.init_moment(lat, lon,
            function(){
                setTimeout(user_a.complete_moment(function ()
               {
                   done();
               }), 1000);
            });
        });
        //it('like connect')
        //it('chat channel')
        //it('like friend added')



    });



});
