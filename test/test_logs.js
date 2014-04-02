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
function signOutUser(token) {
    var url = 'http://' + conf.ip + ':' + conf.listenPort;
    return request(url)
        .get('/user/signout')
        .set('Content-Type', 'application/json')
        .set('token', token)
        .expect(200)
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
function createDigestor(token, digestor) {
    var url = 'http://' + conf.ip + ':' + conf.listenPort;
    var digestor = digestor || {
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
    // Create a new digestor should also create a log entry
    return request(url)
        .post('/digestors')
        .set('token', token)
        .set('Content-Type', 'application/json')
        .send(digestor)
        .expect('Content-Type', /json/)
        .expect(201);
};
function callDigestor(url, route) {
    var url = url || 'http://dedede.' + conf.baseUrl + ':' + conf.listenPort;
    return request(url)
        .get(route || '/test')
        .expect('Content-Type', /text/)
        .expect(200);
};
describe('Log management tests', function () {
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
    describe('Resource CRUD Operations', function() {
        it('should read all logs', function(done) {
            var url = 'http://' + conf.ip + ':' + conf.listenPort;
            createDigestor(token).end(function(err, res) {
                callDigestor().end(function(err, res) {
                    request(url)
                        .get('/logs')
                        .set('token', token)
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function(err, res) {
                            if (err) throw err;
                            res.body.length.should.be.above(0);
                            res.body.map(function (log){ return log._id; }).should.match(/^[0-9a-fA-F]{24}$/);
                            return done();
                        });
                });
            });
        });
        it('should read one log', function(done) {
            var url = 'http://' + conf.ip + ':' + conf.listenPort;
            request(url)
                .get('/logs?limit=1')
                .set('token', token)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) throw err;
                    res.body.length.should.be.above(0);
                    res.body[0]._id.should.match(/^[0-9a-fA-F]{24}$/); // mongodb ObjectId
                    return done();
                });
        });
    });
});
