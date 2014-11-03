var should = require('should');

var request = require('supertest');
var mongoose = require('mongoose');
var express = require('express');
var async = require('async');
var PUBNUB = require('../app/service/pubnub');

var request = request('http://localhost:5050/api');
//mongoose.models = {};
//mongoose.modelSchemas = {};
function User(test_id){
    this.test_id = test_id;

    this.auth_token = 'new';
    this.pubnub_key = '';
    this.require_login = '';
    this.uuid = '';
    var device = {};

    var moments = [];
    this.moment_counter = 0;

    this.current_friend_list = [];
    this.previous_friend_list = [];

    this.current_explore = [];
    this.previous_explore = [];

    this.device_post = (function device_post(next){

        request.post('/device').send({
            auth_token: this.auth_token
        })
        .expect('Content-Type', /json/)
        .end((function(err, res)
        {
            if( err) throw err;
            this.auth_token = res.body.auth_token;
            this.require_login = res.body.require_login;
            this.pubnub_key = res.body.pubnub_key;
            this.uuid = res.body.uuid;
            next(res);

        }).bind(this));

    }).bind(this);

    this.init_moment = function init_moment(lat, lon, next)
    {
        console.log('init_moment');
        console.log(this);
        request.post('/moment')
            .set('Content-Type', 'multipart/form-data')
            .attach('image', __dirname +'/image.jpg')
            .field('auth_token', this.auth_token)
            .field('lat', lat)
            .field('lon', lon)
            .expect('Content-Type', /json/)
            .expect(202)
            .end((function(err, obj)
            {
                setTimeout(next, 1000);
            }).bind(this));

    };
    this.complete_moment = function complete_moment(next)
    {
        console.log('complete_moment');
        this.moment_counter = this.moment_counter +1;
        request.put('/moment')
            .send({
                auth_token: this.auth_token,
                status: this.uuid+this.moment_counter
            })
            .expect(200)
            .expect('Content-Type', /json/)
            .end((function(err, res)
            {
                if( err) throw err;
                this.previous_explore = this.current_explore;
                this.current_explore = res.body.explore_list;
                this.current_friend_list = res.body.explore_list;
                next(res);
            }).bind(this));
    };

    this.update_explore = function update_explore(next)
    {
        request.post('/moment/explore')
            .send({
                auth_token:this.auth_token
            })
            .expect('Content-Type', /json/)
            .expect(200)
            .end((function(err, res)
            {
                console.log(res);
                this.current_explore = res.body.explore_list;
                console.log('res.body.explore_list');
                console.log(res.body.explore_list);
                next();
            }).bind(this));
    };
    this.newLogin = function newLogin(next)
    {
        var lat = Math.floor((Math.random() * 10) + 1);
        var lon = Math.floor((Math.random() * 10) + 1);
        this.init_moment(lat, lon, (function() {
            setTimeout((function()
            {
                this.complete_moment(function(res) {next(res);});
            }).bind(this), 2000);
        }).bind(this));
    }
    this.like = function like(target_status, next)
    {
        var target_like_token = this.current_explore.find(function(element, index, array)
        {
            return (element.status == target_status) ? true:false;
        }).action_token.like;
        request.post('/moment/action')
            .send({
                auth_token:this.auth_token,
                action_token:target_like_token
            })
            .expect('Content-Type', /json/)
            .end(function(err, res)
            {
                console.log(res);
                next();
            })


        return next;
    }

    function chat(next)
    {
        return next;
    }


};


function User_interaction(){

    this.users = [];
    this.genUsers = function genUsers(user_uuid_list, next){
        async.map(user_uuid_list,
            (function (item, cb) {
                var user = new User(item);
                user.device_post(function () {
                    cb(null, user);
                });

            }).bind(this),
            (function (err, users) {
                this.users = users;
                console.log(users);
                next();
            }).bind(this));
    };
    this.allLogin = function allLogin(next)
    {

        async.map(this.users,
            (function (user, cb) {
                var lat = Math.floor((Math.random() * 10) + 1);
                var lon = Math.floor((Math.random() * 10) + 1);
                //user.init_moment(lat, lon, function () {
                user.newLogin(function () {
                    cb(null, user);
                });
            }).bind(this),
            function (err, users) {
                next();
            });
    };

    this.allUpdateExplore = function allUpdateExplore(next)
    {
        async.map(this.users,
            (function (user, next) {
                user.update_explore(function  () {
                    next(null, user);
                });

            }).bind(this),
            function (err, users) {
                next(users);
            });
    }
    this.like_each_other = function like_each_other(user, uid, next)
    {
        var target = this.users[uid];
        async.series(
            [
                function(cb){
                    user.newLogin(function ()
                    {
                        cb(null, '');
                    });
                },
                function(cb){
                    target.newLogin(function ()
                   {
                        cb(null, '');
                    });
                },
                function(cb){
                    target.like(user.uuid+user.moment_counter,function()
                    {
                        cb(null, '');
                    });
                },
                function(cb){
                    user.like(target.uuid+target.moment_counter,function()
                    {
                        cb(null, '');
                    });
                }
            ],
            function(err, results){
                next();
            });

    }
}
module.exports = {
    user:User,
    interaction:User_interaction

}