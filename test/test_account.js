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
    .expect(200)
};

describe('User admin tests', function () {
    var url = 'https://apicatus-c9-bmaggi.c9.io';
    var server = null;
    var app = null;
    // within before() you can run all the operations that are needed to setup your tests. In this case
    // I want to create a connection with the database, and when I'm done, I call done().
    before(function(done) {
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
            try {
                server = startServer();
            } catch(error) {
                console.log("PORT OPEN ?");
                done();
            }
            done();
        }

        mongoose.connection.on("open", function() {
            clearCollections();
            try {
                server = startServer();
            } catch(error) {
                console.log("PORT OPEN ?");
                return done();
            }
            done();
        });
    });
    after(function (done) {
        return done();
        /* TODO:
            find a way to run modular tests with global hooks but without having
            to reconnect
        */
        function clearCollections() {
          for (var collection in mongoose.connection.collections) {
              mongoose.connection.collections[collection].remove(function () {});
          }
        }
        clearCollections();
        mongoose.disconnect(function() {
            server.close(function() {
                console.log("server closedv")
                return done();
            });
        })
    });

    describe('CRUD Operations', function() {
        it('should crete a new user', function(done) {
            var url = 'http://' + conf.ip + ':' + conf.listenPort;
            var profile = {
                username: 'admin',
                password: 'admin',
                email: 'admin@admin.com'
            };
            request(url)
                .post('/user')
                .set('Content-Type', 'application/json')
                .send(profile)
                .expect('Content-Type', /json/)
                .expect(201)
                .end(function(err, res) {
                    if (err) throw err;
                    res.statusCode.should.equal(201);
                    return done();
                });
        });
        it('should read a user account', function(done) {
            'user strict'
            var url = 'http://' + conf.ip + ':' + conf.listenPort;
            var profile = {
                username: 'admin',
                password: 'admin'
            };
            request(url)
                .post('/user/signin')
                .send(profile)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) throw err;
                    res.body.username.should.equal('admin')
                    var token = res.body.token.token;
                    request(url)
                        .get('/user')
                        .set('token', token)
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function(err, res) {
                            if (err) throw err;
                            res.body.username.should.equal('admin')
                            res.body._id.should.match(/^[0-9a-fA-F]{24}$/); // mongodb ObjectId
                            return done();
                        });
                });
        });
        it('should update a user account', function(done) {
            'user strict'
            var url = 'http://' + conf.ip + ':' + conf.listenPort;
            var profile = {
                username: 'admin',
                password: 'admin'
            };
            request(url)
                .post('/user/signin')
                .send(profile)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) throw err;
                    res.body.username.should.equal('admin')
                    var token = res.body.token.token;
                    request(url)
                        .put('/user')
                        .send({email: "new@host.com"})
                        .set('token', token)
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function(err, res) {
                            if (err) throw err;
                            res.statusCode.should.equal(200)
                            return done();
                        });
                });
        })
        it('should be able to delete a user account', function(done) {
            var url = 'http://' + conf.ip + ':' + conf.listenPort;
            var profile = {
                username: 'admin',
                password: 'admin'
            };
            request(url)
                .post('/user/signin')
                .send(profile)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) throw err;
                    res.body.username.should.equal('admin')
                    var token = res.body.token.token;
                    request(url)
                        .del('/user')
                        .set('token', token)
                        .expect(204)
                        .end(function(err, res) {
                            if (err) throw err;
                            res.statusCode.should.equal(204);
                            return done();
                        });
                });
        });
    });
    ///////////////////////////////////////////////////////////////////////////
    // Create user first                                                     //
    ///////////////////////////////////////////////////////////////////////////
    describe('Authentication', function() {
        it('should be able to login', function(done) {
            var url = 'http://' + conf.ip + ':' + conf.listenPort;
            var profile = {
                username: 'admin',
                password: 'admin',
                email: 'admin@admin.com'
            };
            request(url)
                .post('/user')
                .set('Content-Type', 'application/json')
                .send(profile)
                .expect('Content-Type', /json/)
                .expect(201)
                .end(function(err, res) {
                    if (err) throw err;
                    res.statusCode.should.equal(201);
                    res.body.username.should.equal('admin')
                    request(url)
                        .post('/user/signin')
                        .send(profile)
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function(err, res) {
                            if (err) throw err;
                            res.body.username.should.equal('admin');
                            return done();
                        });
                });
        });
        it('should be able to signout', function(done) {
            var url = 'http://' + conf.ip + ':' + conf.listenPort;
            loginUser().end(function(err, res) {
                if (err) throw err;
                res.body.username.should.equal('admin')
                var token = res.body.token.token;
                request(url)
                .get('/user/signout')
                .set('Content-Type', 'application/json')
                .set('token', token)
                .expect(200)
                .end(function(err, res) {
                    if (err) throw err;
                    res.statusCode.should.equal(200)
                    return done();
                });
            });
        });
        it('should check for wrong password', function(done) {
            'user strict'
            var url = 'http://' + conf.ip + ':' + conf.listenPort;
            var profile = {
                username: 'admin',
                password: 'wrongpass'
            };
            request(url)
                .post('/user/signin')
                .send(profile)
                .expect(401)
                .end(function(err, res) {
                    if (err) throw err;
                    res.statusCode.should.equal(401);
                    return done();
                });
        });
        it('should send reset token', function(done) {
            'user strict'
            var url = 'http://' + conf.ip + ':' + conf.listenPort;
            request(url)
                .post('/user/forgot')
                .send({email: 'admin@admin.com'})
                .expect(200)
                .end(function(err, res) {
                    if (err) throw err;
                    return done();
                });
        });
    });
    describe('Safety test', function() {
        it('should fail trying to read a user account without token', function(done) {
            'user strict'
            var url = 'http://' + conf.ip + ':' + conf.listenPort;
            request(url)
            .get('/user')
            .expect('Content-Type', /json/)
            .expect(403)
            .end(function(err, res) {
                if (err) throw err;
                return done();
            });
        });
        it('should fail trying to read with invalid token', function(done) {
            'user strict'
            var url = 'http://' + conf.ip + ':' + conf.listenPort;
            var falseToken = "this-token-is-invalid"
            request(url)
            .get('/user')
            .set('Content-Type', 'application/json')
            .set('token', falseToken)
            .expect(403)
            .end(function(err, res) {
                if (err) throw err;
                return done();
            });
        });
        it('shouldn\'t be able to crete duplicated users', function(done) {
            var url = 'http://' + conf.ip + ':' + conf.listenPort;
            var profile = {
                username: 'admin',
                password: 'admin',
                email: 'admin@admin.com'
            };
            request(url)
                .post('/user')
                .set('Content-Type', 'application/json')
                .send(profile)
                .expect('Content-Type', /json/)
                .expect(409)
                .end(function(err, res) {
                    if (err) throw err;
                    return done();
                });
        });
    });
    /*describe('Digestor Management', function () {
        var cookie = null;
        before(function(done) {
            var url = 'http://' + conf.ip + ':' + conf.listenPort;
            var profile = {
                username: 'admin',
                password: 'admin'
            };
            // Login
            request(url)
                .post('/user/signin')
                .send(profile)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) throw err;
                    res.body.username.should.equal('admin');
                    cookie = res.headers['set-cookie'];
                    return done();
                });
        });
        describe('Resource CRUD Operations', function() {
            it('should crete a new digestor', function(done) {
                var url = 'http://' + conf.ip + ':' + conf.listenPort;
                var digestor = {
                    name: 'myDigestor'
                };
                var profile = {
                    username: 'admin',
                    password: 'admin'
                };
                request(url)
                    .post('/user/signin')
                    .set('Content-Type', 'application/json')
                    .send(profile)
                    .expect('Content-Type', /json/)
                    .end(function(err, res) {
                        if (err) throw err;
                        res.body.username.should.equal('admin')
                        var token = res.body.token.token;
                        request(url)
                            .post('/digestors')
                            .set('token', token)
                            .set('Content-Type', 'application/json')
                            .send(digestor)
                            .expect('Content-Type', /json/)
                            .expect(201)
                            .end(function(err, res) {
                                if (err) throw err;
                                res.body.name.should.equal('myDigestor');
                                return done();
                            });
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
                        res.body.map(function (item){return item._id}).should.match(/^[0-9a-fA-F]{24}$/);
                        return done();
                    });
            });
            it('should read one digestor', function(done) {
                var url = 'http://' + conf.ip + ':' + conf.listenPort;
                var digestor = {
                    name: 'myDigestor'
                };
                request(url)
                    .get('/digestors/' + digestor.name)
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
                var profile = {
                    username: 'admin',
                    password: 'admin'
                };
                request(url)
                    .post('/user/signin')
                    .set('Content-Type', 'application/json')
                    .send(profile)
                    .expect('Content-Type', /json/)
                    .end(function(err, res) {
                        if (err) throw err;
                        res.body.username.should.equal('admin')
                        var token = res.body.token.token;
                        request(url)
                            .put('/digestors/' + digestor.name)
                            .set('token', token)
                            .send(digestor)
                            .expect('Content-Type', /json/)
                            .expect(200)
                            .end(function(err, res) {
                                if (err) throw err;
                                res.statusCode.should.equal(200)
                                request(url)
                                    .get('/digestors/' + digestor.name)
                                    .set('token', token)
                                    .expect('Content-Type', /json/)
                                    .expect(200)
                                    .end(function(err, res) {
                                        if (err) throw err;
                                        res.statusCode.should.equal(200);
                                        res.body.hits.should.equal(33);
                                        return done();
                                    });
                            });
                    });
            });
            it('should delete one digestor', function(done) {
                var url = 'http://' + conf.ip + ':' + conf.listenPort;
                var digestor = {
                    name: 'myDigestor'
                };
                request(url)
                    .del('/digestors/' + digestor.name)
                    .set('cookie', cookie)
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
                    .set('cookie', cookie)
                    .expect(204)
                    .end(function(err, res) {
                        if (err) throw err;
                            res.statusCode.should.equal(204);
                        return done();
                    });
            });
        });
    });*/
});

