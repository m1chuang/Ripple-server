var should = require('should');
var assert = require('assert');
var request = require('supertest');
var mongoose = require('mongoose');
var express = require('express');
var DEVICE = require('../app/model/deviceModel');
var PUBNUB = require('../app/controller/pubnub');

//mongoose.models = {};
//mongoose.modelSchemas = {};


describe('Routing', function() {

    request = request('http://localhost:5050/api');
    before(function(done)
    {
        mongoose.connect('mongodb://neshorange:Nesh6502@ds039850.mongolab.com:39850/glimpse-test',
            function()
            {
                mongoose.connection.collections['devices'].drop();
                mongoose.connection.collections['moments'].drop();
                done();
            });
    });

    var devices = [
            {
                device_id: 'michael',
            },
            {
                device_id: 'ryan',
            }];

    describe('Device', function()
    {
        before(function(done)
        {
            var dummy = ['alex', 'doris', 'albee', 'katie'];
            for(i = 0; i < 4; i ++){
                request
                .post('/device')
                .send(
                    {
                        device_id : dummy[i]
                    })
                .end(function(err, res) {
                      if (err) throw err;
                });
            }
            done();
        });



        it('should return 201 if the device is not found and has successfully created device in db and pubnub connection. ',
            function(done)
            {
                request
                .post('/device')
                .send(devices[0])
                .expect('Content-Type', /json/)
                .expect(201) //Status code
                .end(function(err, res)
                {
                    if (err) {

                        throw err;
                    }
                    //test client to channel connection
                    /*
                    PUBNUB.testSubscribe( devices[0], res.body.server_auth_key, function(info)
                    {
                        console.log(info);
                        done();
                    } );
                    */
                    done();
                });
             });


        it('should return 200 if the device is found',
            function(done)
            {
                request
                .post('/device')
                .send(devices[0])
                .expect('Content-Type', /json/)
                .expect(200) //Status code
                .end(function(err, res)
                {
                      if (err) {
                        throw err;
                      }
                      done();
                });
             });

    });

    describe('Moment', function() {
        var moment_init = [{

            device_id : devices[0].device_id,
            image   :   'data:image/gif;base64,R0lGODlhDwAPAKECAAAAzMzM/////wAAAC',
            lat : 1,
            lon : 1
        }];
        var moment_finish = [{

            device_id : devices[0].device_id,
            status : 'hello I am '+devices[0].device_id,
            skip : 0,
            offset : 20
        }];

        before(function(done)
        {
            var dummy = ['alex', 'doris', 'albee', 'katie'];
            for(i = 0; i < 4; i ++){
                request
                .post('/moment')
                .send(
                    {
                        device_id : dummy[i],
                        image   :   'data:image/gif;base64,R0lGODlhDwAPAKECAAAAzMzM/////wAAAC',
                        lat : 1,
                        lon : 1
                    })
                .end(function(err, res)
                    {

                        if (err){ throw err };

                        request
                        .put('/moment')
                        .send(
                            {
                                device_id : dummy[i],
                                status : 'hello I am '+dummy[i],
                                skip : 0,
                                offset : 20
                            })
                        .end(function(err, res) {
                              if (err){ throw err};
                        });

                    });
            }
            done();

        });


        it('Initialize moment, should be store in device.moments',
            function(done)
            {

                request
                .post('/moment')
                .send(moment_init[0])
                .expect('Content-Type', /json/)
                .expect(200) //Status code
                .end(function(err, res)
                {
                      if (err) {
                        throw err;
                      }
                      res.body.device.moments[0].complete.should.equal(false);
                      done();

                });


            });

        it('Finalise moment, should be post in moments collection',
            function(done)
            {

                request
                .put('/moment')
                .send(moment_finish[0])
                .expect('Content-Type', /json/)
                .expect(200) //Status code
                .end(function(err, res)
                {
                      if (err) {
                        throw err;
                      }

                      //console.log(res.body);
                      done();
                });


            });


    });

    describe('Like', function() {

        it('First time like will create a relation object in target\'s moment',
            function(done)
            {
                /*
                request
                .post('/like')
                .send(moment_finish[0])
                .expect('Content-Type', /json/)
                .expect(200) //Status code
                .end(function(err, res)
                {
                      if (err) {
                        throw err;
                      }

                      console.log(res.body);
                      done();
                });


            */

                done();
            });


    });
});
