///////////////////////////////////////////////////////////////////////////////
// @file         : app.js                                                   //
// @summary      : Main Application entry point                              //
// @version      : 0.1                                                       //
// @project      : Apicat.us                                                 //
// @description  :                                                           //
// @author       : Benjamin Maggi                                            //
// @email        : benjaminmaggi@gmail.com                                   //
// @date         : 06 Oct 2013                                               //
// @license:     : MIT                                                       //
// ------------------------------------------------------------------------- //
//                                                                           //
// Copyright 2013~2014 Benjamin Maggi <benjaminmaggi@gmail.com>              //
//                                                                           //
//                                                                           //
// License:                                                                  //
// Permission is hereby granted, free of charge, to any person obtaining a   //
// copy of this software and associated documentation files                  //
// (the "Software"), to deal in the Software without restriction, including  //
// without limitation the rights to use, copy, modify, merge, publish,       //
// distribute, sublicense, and/or sell copies of the Software, and to permit //
// persons to whom the Software is furnished to do so, subject to the        //
// following conditions:                                                     //
//                                                                           //
// The above copyright notice and this permission notice shall be included   //
// in all copies or substantial portions of the Software.                    //
//                                                                           //
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS   //
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF                //
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.    //
// IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY      //
// CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,      //
// TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE         //
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.                    //
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
    Analytics = require('./controllers/analytics'),
    passport = require('passport'),
    DigestCtl = require('./controllers/digest'),
    Importer = require('./controllers/importer'),
    Throttle = require('./services/throttle');

///////////////////////////////////////////////////////////////////////////////
// Run app                                                                   //
///////////////////////////////////////////////////////////////////////////////
var app = express();
var SERVER = null;
var DB = null;

exports.app = app;

//Mailer.sendTemplate("hola", "<h1>Hola</h1>", "subject", ['benjaminmaggi@gmail.com']);
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
        console.log('connected to: %s:%s', conf.ip, conf.listenPort);
        return SERVER;
    }
};

////////////////////////////////////////////////////////////////////////////////
// Mongoose event listeners                                                   //
////////////////////////////////////////////////////////////////////////////////
mongoose.connection.on('open', function() {
    'use strict';
    console.log('mongodb connected');
});
mongoose.connection.on('error', function(error) {
    'use strict';
    console.log('mongodb connection error: %s', error);
});
// When the connection is disconnected
mongoose.connection.on('disconnected', function () {
    'use strict';
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

// Rate limit middleware

function checkRate(request, response, next) {
    'use strict';

}
// reusable middleware to test authenticated sessions
function ensureAuthenticated(request, response, next) {
    'use strict';

    var token = request.headers.token;

    if(token) {
        AccountMdl.verify(token, function(error, expired, decoded) {
            if(error) {
                response.statusCode = 403;
                response.json({error: 'Invalid token !'});
            } else if(expired) {
                response.statusCode = 403;
                response.json({error: 'Token expired. You need to log in again.'});
            } else {
                request.user = decoded;
                return next();
            }
        });
    } else {
        response.statusCode = 403;
        response.json({error: 'No auth token received !'});
        /*
        if(request.accepts('html')) {
            console.log("llego x html");
            response.redirect(conf.baseUrl + '/login');
        } else {
            response.statusCode = 403;;
            response.json({error: 'No auth token received !'});
        }
        */
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
    app.use(Throttle.throttle);
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
app.get('/digestors/:id', ensureAuthenticated, DigestorCtl.readOne);
app.put('/digestors/:id', ensureAuthenticated, DigestorCtl.updateOne);
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
app.post('/user/forgot', AccountCtl.resetToken);
app.get('/user/reset/:id/:email', function(req, res) {
    'use strict';

    console.log('GOT IN /reset/:id...');
    var token = req.params.id,
        email = req.params.email,
        messages = flash(null, null);

    if (!token) {
        console.log('Issue getting reset :id');
        //TODO: Error response...
    }
    else {
        console.log('In ELSE ... good to go.');
        //TODO
        //
        //1. find user with reset_token == token .. no match THEN error
        //2. check now.getTime() < reset_link_expires_millis
        //3. if not expired, present reset password page/form
        res.render('resetpass', {email: email});
    }
});


///////////////////////////////////////////////////////////////////////////////
// Analytics                                                                 //
///////////////////////////////////////////////////////////////////////////////
app.get('/metrics', Analytics.metrics);
app.get('/geo', Analytics.geo);
app.get('/languages', Analytics.languages);
app.get('/platform', Analytics.platform);



app.get('/throttle', Throttle.throttle, function(req, res) {
    res.json({message: "hello throttle"});
});
///////////////////////////////////////////////////////////////////////////////
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in GitHub authentication will involve redirecting
//   the user to github.com.  After authorization, GitHubwill redirect the user
//   back to this application at /auth/github/callback
///////////////////////////////////////////////////////////////////////////////

//app.get('/auth/github', AccountCtl.githubAuth);
//app.get('/auth/github/callback', AccountCtl.githubAuthCallback);


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
app.post('/import/blueprint', ensureAuthenticated, Importer.blueprint);
app.post('/import/test', ensureAuthenticated, Importer.test);

///////////////////////////////////////////////////////////////////////////////
// socket.io                                                                 //
///////////////////////////////////////////////////////////////////////////////

SERVER = init();
///////////////////////////////////////////////////////////////////////////////
// Gracefully Shuts down the workers.
///////////////////////////////////////////////////////////////////////////////
process
    .on('SIGTERM', function () {
        'use strict';

        console.log('SIGTERM');
        SERVER.close(function () {
            mongoose.connection.close(function () {
                process.exit(0);
            });
        });
    })
    .on('SIGHUP', function () {
        //killAllWorkers('SIGTERM');
        //createWorkers(numCPUs * 2);
    })
    .on('SIGINT', function() {
        'use strict';

        console.log('SIGINT');
        SERVER.close(function () {
            mongoose.connection.close(function () {
                process.exit(1);
            });
        });
    });


