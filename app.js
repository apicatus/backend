///////////////////////////////////////////////////////////////////////////////
// @file         : app.js                                                    //
// @summary      : Apicat.us API                                             //
// @version      : 0.1                                                       //
// @project      : apicat.us                                                 //
// @description  :                                                           //
// @author       : Benjamin Maggi                                            //
// @email        : benjaminmaggi@gmail.com                                   //
// @date         : 6 Oct 2013                                                //
// ------------------------------------------------------------------------- //
//                                                                           //
// @copyright Copyright 2014 Benjamin Maggi, all rights reserved.            //
//                                                                           //
//                                                                           //
// License:                                                                  //
// This program is free software; you can redistribute it                    //
// and/or modify it under the terms of the GNU General Public                //
// License as published by the Free Software Foundation;                     //
// either version 2 of the License, or (at your option) any                  //
// later version.                                                            //
//                                                                           //
// This program is distributed in the hope that it will be useful,           //
// but WITHOUT ANY WARRANTY; without even the implied warranty of            //
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the             //
// GNU General Public License for more details.                              //
//                                                                           //
///////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////
// Module dependencies.                                                      //
///////////////////////////////////////////////////////////////////////////////
var http = require('http'),
    socketio  = require('socket.io'),
    express = require('express'),
    mongoose = require('mongoose'),
    conf = require('./config'),
    AccountMdl = require('./models/account'),
    AccountCtl = require('./controllers/account'),
    DigestorCtl = require('./controllers/digestor'),
    LogsCtl = require('./controllers/logs'),
    passport = require('passport'),
    DigestCtl = require('./controllers/digest'),
    Importer = require('./controllers/importer');

///////////////////////////////////////////////////////////////////////////////
// Run app                                                                   //
///////////////////////////////////////////////////////////////////////////////
var app = express();
var SERVER = null;
var DB = null;

exports.app = app;
////////////////////////////////////////////////////////////////////////////////
// Mongo URL generator                                                        //
////////////////////////////////////////////////////////////////////////////////
var generateMongoUrl = function(conf) {
    'use strict';

    if(conf.username && conf.password) {
        return 'mongodb://' + conf.username + ':' + conf.password + '@' + conf.hostname + ':' + conf.port + '/' + conf.db;
    }
    else{
        return 'mongodb://' + conf.hostname + ':' + conf.port + '/' + conf.db;
    }
};
////////////////////////////////////////////////////////////////////////////////
// MongoDB Connection setup                                                   //
////////////////////////////////////////////////////////////////////////////////
var init = function() {
    'use strict';

    var server = null;
    var mongoUrl = null;

    // In some test context it may be a good idea to init the service
    // from whitin the test unit instead
    if(conf.autoStart) {
        mongoUrl = generateMongoUrl(conf.mongoUrl);
        // Connect mongoose
        DB = mongoose.connect(mongoUrl);
        // http://stackoverflow.com/questions/17696801/express-js-app-listen-vs-server-listen
        // TODO make express 4.0 compatible
        SERVER = http.createServer(app);
        SERVER.listen(conf.listenPort, conf.ip);
        socketio.listen(SERVER);
        console.log("connected to: %s:%s", conf.ip, conf.listenPort);
        return SERVER;
    }
};

////////////////////////////////////////////////////////////////////////////////
// Mongoose event listeners                                                   //
////////////////////////////////////////////////////////////////////////////////
mongoose.connection.on('open', function() {
    console.log('mongodb connected');
});
mongoose.connection.on('error', function(error) {
    console.log('mongodb connection error: %s', error);
});
// When the connection is disconnected
mongoose.connection.on('disconnected', function () {
    console.log('Mongoose default connection disconnected');
});


///////////////////////////////////////////////////////////////////////////////
// CORS middleware (only to test on cloud9)                                  //
///////////////////////////////////////////////////////////////////////////////
var allowCrossDomain = function(request, response, next) {
    'use strict';

    response.header('Access-Control-Allow-Origin', '*');
    response.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-Level3-Digest-Time, Content-Type, Authorization, Accept');
    response.header('Access-Control-Allow-Methods', 'OPTIONS, GET, HEAD, POST, PUT, DELETE, TRACE, CONNECT');

    // intercept OPTIONS method
    if ('OPTIONS' === request.method) {
        response.send(200);
    }
    else {
        next();
    }
};
// reusable middleware to test authenticated sessions
function ensureAuthenticated(request, response, next) {
    'use strict';

    var token = request.headers.token;

    if(token) {
        AccountMdl.verify(token, function(error, isValid, decoded) {
            if(error || !isValid) {
                response.statusCode = 403;
                response.json({error: 'Invalid token !'});
            } else {
                request.decoded = decoded;
                return next();
            }
        });
    } else {
        if(request.accepts('html')) {
            console.log("llego x html");
            response.redirect(conf.baseUrl + '/login');
        } else {
            response.statusCode = 403;;
            response.json({error: 'No auth token received !'});
        }
    }
}

///////////////////////////////////////////////////////////////////////////////
// Configuration                                                             //
///////////////////////////////////////////////////////////////////////////////
app.configure(function() {
    'use strict';

    app.set('title', 'Apicat.us');
    app.set('view engine', 'html');
    app.set('views', __dirname + '/views');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    /* app.use(express.cookieParser()); */
    /* app.use(express.session({ secret: conf.sessionSecret })); */
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(allowCrossDomain);
    app.use(app.router);
    app.use(DigestCtl.digestRequest);
    app.use(express.static(conf.staticPath));
});

app.configure('development', function() {
    'use strict';

    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    app.use(express.logger());
});
app.configure('testing', function() {
    'use strict';

    app.use(express.errorHandler());
});
app.configure('production', function() {
    'use strict';

    app.use(express.errorHandler());
});

///////////////////////////////////////////////////////////////////////////////
// Digestors CURD Management                                                 //
///////////////////////////////////////////////////////////////////////////////
// Collections
app.post('/digestors', ensureAuthenticated, DigestorCtl.create);
app.get('/digestors', ensureAuthenticated, DigestorCtl.read);
app.delete('/digestors', ensureAuthenticated, DigestorCtl.deleteAll);
// Entities
app.get('/digestors/:name', ensureAuthenticated, DigestorCtl.readOne);
app.put('/digestors/:name', ensureAuthenticated, DigestorCtl.updateOne);
app.delete('/digestors/:name', ensureAuthenticated, DigestorCtl.deleteOne);


///////////////////////////////////////////////////////////////////////////////
// Logs CRUD                                                                 //
///////////////////////////////////////////////////////////////////////////////
// Collections
app.post('/logs', LogsCtl.create);
app.get('/logs', LogsCtl.read);
// Entities
app.put('/logs/:id', LogsCtl.update);
app.delete('/logs/:id', LogsCtl.delete);

///////////////////////////////////////////////////////////////////////////////
// Application rutes                                                         //
///////////////////////////////////////////////////////////////////////////////
app.get('/', function(request, response) {
    'use strict';
    response.sendfile(conf.staticPath + '/index.html');
});
///////////////////////////////////////////////////////////////////////////////
// User CRUD Methods & Servi                                                 //
///////////////////////////////////////////////////////////////////////////////
app.post('/user/signin', AccountCtl.signIn);
app.get('/user/signout', ensureAuthenticated, AccountCtl.signOut);
app.post('/user', AccountCtl.create);
app.get('/user', ensureAuthenticated, AccountCtl.read);
app.put('/user', ensureAuthenticated, AccountCtl.update);
app.del('/user', ensureAuthenticated, AccountCtl.delete);
app.post('/token', ensureAuthenticated, AccountCtl.token);

// GET /auth/github
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in GitHub authentication will involve redirecting
//   the user to github.com.  After authorization, GitHubwill redirect the user
//   back to this application at /auth/github/callback

app.get('/auth/github', AccountCtl.githubAuth);
app.get('/auth/github/callback', AccountCtl.githubAuthCallback);
//app.get('/auth/github', passport.authenticate('github'), function(request, response) {
//    'use strict';
    // The request will be redirected to GitHub for authentication, so this
    // function will not be called.
//});

// GET /auth/github/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
//app.get('/auth/github/callback', passport.authenticate('github', { session: false }), function(request, response) {
//    'use strict';

//    response.json(request.user);
//});
//app.get('/auth/github/callback', AccountCtl.githubCallback);
///////////////////////////////////////////////////////////////////////////////
// API Model Importer service                                                //
///////////////////////////////////////////////////////////////////////////////
app.post('/importer/blueprint', ensureAuthenticated, Importer.blueprint);

///////////////////////////////////////////////////////////////////////////////
// Restarts the workers.
 ///////////////////////////////////////////////////////////////////////////////
process.on('SIGHUP', function () {
    //killAllWorkers('SIGTERM');
    //createWorkers(numCPUs * 2);
});


///////////////////////////////////////////////////////////////////////////////
// socket.io                                                                 //
///////////////////////////////////////////////////////////////////////////////

SERVER = init();
///////////////////////////////////////////////////////////////////////////////
// Gracefully Shuts down the workers.
///////////////////////////////////////////////////////////////////////////////
process.on('SIGTERM', function () {
    'use strict';

    console.log("SIGTERM");
    SERVER.close(function () {
        mongoose.connection.close(function () {
            process.exit(0);
        });
    });
});

process.on('SIGINT', function() {
    'use strict';

    console.log("SIGINT");
    SERVER.close(function () {
        mongoose.connection.close(function () {
            process.exit(1);
        });
    });
});


