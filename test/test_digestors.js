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

describe('Digestor management tests', function () {
    var cookie = null;
    var token = null;
    var server = null;
    var app = null;
    var digestorId = null; // ID of Digestor to pass around
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
        it('should crete a new digestor', function(done) {
            var url = 'http://' + conf.ip + ':' + conf.listenPort;
            var digestor = {
                name: 'myDigestor'
            };
            request(url)
                .post('/digestors')
                .set('token', token)
                .set('Content-Type', 'application/json')
                .send(digestor)
                .expect('Content-Type', /json/)
                .expect(201)
                .end(function(err, res) {
                    if (err) throw err;
                    res.body._id.should.match(/^[0-9a-fA-F]{24}$/);
                    res.body.name.should.equal('myDigestor');
                    digestorId = res.body._id;
                    return done();
                });
        });
        it('should read all digestors', function(done) {
            var url = 'http://' + conf.ip + ':' + conf.listenPort;
            var digestor = {
                name: 'myDigestor'
            };
            request(url)
                .get('/digestors')
                .set('token', token)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) throw err;
                    res.body.length.should.be.above(0);
                    res.body.map(function (item){ return item._id; }).should.match(/^[0-9a-fA-F]{24}$/);
                    return done();
                });
        });
        it('should read one digestor', function(done) {
            var url = 'http://' + conf.ip + ':' + conf.listenPort;
            var digestor = {
                name: 'myDigestor'
            };
            request(url)
                .get('/digestors/' + digestorId)
                .set('token', token)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) throw err;
                    res.body.name.should.equal('myDigestor');
                    res.body._id.should.match(/^[0-9a-fA-F]{24}$/); // mongodb ObjectId
                    return done();
                });
        });
        it('should update one digestor ', function(done) {
            'user strict'
            var url = 'http://' + conf.ip + ':' + conf.listenPort;
            var date = new Date();
            var digestor = {
                name: 'myDigestor',
                hits: 33
            };
            request(url)
                .put('/digestors/' + digestorId)
                .set('token', token)
                .send(digestor)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) throw err;
                    res.statusCode.should.equal(200);
                    res.body.name.should.equal('myDigestor');
                    res.body._id.should.match(/^[0-9a-fA-F]{24}$/); // mongodb ObjectId
                    digestorId = res.body._id;
                    request(url)
                        .get('/digestors/' + digestorId)
                        .set('token', token)
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function(err, res) {
                            if (err) throw err;
                            res.statusCode.should.equal(200);
                            res.body.name.should.equal('myDigestor');
                            res.body._id.should.match(/^[0-9a-fA-F]{24}$/); // mongodb ObjectId
                            res.body.hits.should.equal(33);
                            return done();
                        });
                });
        });
        it('should delete one digestor', function(done) {
            var url = 'http://' + conf.ip + ':' + conf.listenPort;
            var digestor = {
                name: 'myDigestor'
            };
            request(url)
                .del('/digestors/' + digestorId)
                .set('token', token)
                .expect(204)
                .end(function(err, res) {
                    if (err) throw err;
                        res.statusCode.should.equal(204);
                    return done();
                });
        });
        it('should delete all digestors', function(done) {
            var url = 'http://' + conf.ip + ':' + conf.listenPort;
            var digestor = {
                name: 'myDigestor'
            };
            request(url)
                .del('/digestors')
                .set('token', token)
                .expect(204)
                .end(function(err, res) {
                    if (err) throw err;
                        res.statusCode.should.equal(204);
                    return done();
                });
        });
    });
    describe('Resource Safe Operations', function() {
        it('should fail trying to read unexistant digestor', function(done) {
            var url = 'http://' + conf.ip + ':' + conf.listenPort;
            var digestor = {
                name: 'myDigestor'
            };
            request(url)
                .get('/digestors/' + digestorId)
                .set('token', token)
                .expect('Content-Type', /json/)
                .expect(404)
                .end(function(err, res) {
                    if (err) throw err;
                    return done();
                });
        });
        it('should fail trying to read without credentials', function(done) {
            var url = 'http://' + conf.ip + ':' + conf.listenPort;
            var digestor = {
                name: 'myDigestor'
            };
            request(url)
                .get('/digestors/' + digestor.name)
                .set('Content-Type', 'application/json')
                .expect('Content-Type', /json/)
                .expect(403)
                .end(function(err, res) {
                    if (err) throw err;
                    return done();
                });
        });
    });
});
