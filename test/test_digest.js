var conf = require('../config');
var express = require('express');
var mongoose = require('mongoose');
var should = require('should');
//var expect = require('expect');
var assert = require('assert');
var request = require('supertest');
var http = require('http');
var APP = require("../app").app;



function loginUser(profle) {
    var url = 'http://' + conf.ip + ':' + conf.listenPort;
    var profile = profle || {
        username: 'admin',
        password: 'admin',
        email: 'admin@admin.com'
    };
    return request(url)
        .post('/user/signin')
        .set('Content-Type', 'application/json')
        .send(profile)
        .expect('Content-Type', /json/)
        .expect(200);
};
function createUser(profile) {
    var url = 'http://' + conf.ip + ':' + conf.listenPort;
    var profile = profile || {
        username: 'admin',
        password: 'admin',
        email: 'admin@admin.com'
    };
    return request(url)
        .post('/user')
        .set('Content-Type', 'application/json')
        .send(profile)
        .expect('Content-Type', /json/)
        .expect(201);
};
describe('API digest service tests', function () {
    var cookie = null;
    var token = null;
    var server = null;
    var app = null;
    before(function(done) {
        var url = 'http://' + conf.ip + ':' + conf.listenPort;
        var profile = {
            username: 'admin',
            password: 'admin'
        };
        function clearCollections() {
          for (var collection in mongoose.connection.collections) {
              mongoose.connection.collections[collection].remove(function () {});
          }
        }
        function startServer() {
            server = require('http').createServer(APP)
            server.listen(conf.listenPort);
            return server;
        }
        if(mongoose.connection.readyState === 0) {
            mongoose.connect('mongodb://admin:admin@alex.mongohq.com:10062/cloud-db');
        } else if(mongoose.connection.readyState === 1) {
            clearCollections();

            createUser().end(function(err, res) {
                loginUser().end(function(err, res) {
                    if (err) throw err;
                    res.body.username.should.equal('admin')
                    token = res.body.token.token;
                    return done();
                });
            });
        }

        mongoose.connection.on("open", function() {
            clearCollections();
            server = startServer();
            // Create user & Login
            createUser().end(function(err, res) {
                loginUser().end(function(err, res) {
                    if (err) throw err;
                    res.body.username.should.equal('admin')
                    token = res.body.token.token;
                    return done();
                });
            });
        });
    });
    describe('Digest operations', function() {
        it('should read all logs', function(done) {
            var url = 'http://' + conf.ip + ':' + conf.listenPort;
            var digestor = {
                name: 'dedede',
                endpoints : [
                    {
                        name: "Resource Group A",
                        methods : [
                            {
                                name : "Method Test",
                                method : "GET",
                                URI : "/test",
                                response : {
                                    message : "{\n    \"data\": \"hello world\",\n    \"code\": 123\n}",
                                    headers : [
                                        {
                                            value : "ok",
                                            name : "test-header"
                                        }
                                    ],
                                    contentType: "text/plain",
                                    statusCode : 200
                                },
                                parameters: [],
                                proxy : {
                                    enabled: false
                                }
                            }
                        ]
                    }
                ]
            };
            // Create a new digestor
            request(url)
                .post('/digestors')
                .set('token', token)
                .set('Content-Type', 'application/json')
                .send(digestor)
                .expect('Content-Type', /json/)
                .expect(201)
                .end(function(err, res) {
                    if (err) throw err;
                    res.body.name.should.equal('dedede');
                    res.body.endpoints.length.should.be.above(0);
                    //return done();
                    var url = 'http://dedede.' + conf.baseUrl + ':' + conf.listenPort;
                    request(url)
                        .get('/test')
                        .expect('Content-Type', /text/)
                        .expect(200)
                        .end(function(err, res) {
                            if (err) throw err;
                            res.text.length.should.be.above(0);
                            return done();
                        });
                });
        });
    });
});
