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
var fs = require('fs'),
    http = require('http'),
    https = require('https'),
    socketio  = require('socket.io'),
    express = require('express'),
    bodyParser = require('body-parser'),
    errorhandler = require('errorhandler'),
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
    notifierService = require('./services/notifier'),
    elasticsearch = require('elasticsearch');

///////////////////////////////////////////////////////////////////////////////
// Application Variables                                                     //
///////////////////////////////////////////////////////////////////////////////
var app = express();
var router = express.Router();
var IO = null;
var DB = null;



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
// Aplication setup database and http & sockets                               //
////////////////////////////////////////////////////////////////////////////////
var init = function() {
    'use strict';

    var mongoUrl = null;
    var io = null;
    var server = null;
    var elastica = null;
    // In some test context it may be a good idea to init the service
    // from whitin the test unit instead
    if(conf.autoStart) {
        mongoUrl = generateMongoUrl(conf.mongoUrl);
        ///////////////////////////////////////////////////////////////////////////////
        // Connect mongoose                                                          //
        ///////////////////////////////////////////////////////////////////////////////
        DB = mongoose.connect(mongoUrl);
        ///////////////////////////////////////////////////////////////////////////////
        // Connect to elasticsearch                                                  //
        ///////////////////////////////////////////////////////////////////////////////
        elastica = new elasticsearch.Client(conf.elasticsearch);
        ///////////////////////////////////////////////////////////////////////////////
        // Start listening prod HTTP or HTTPS                                        //
        ///////////////////////////////////////////////////////////////////////////////
        if(conf.ssl) {
            conf.ssl.key = fs.readFileSync(conf.ssl.key);
            conf.ssl.cert = fs.readFileSync(conf.ssl.cert);
            server = https.createServer(conf.ssl, app).listen(conf.listenPort, conf.ip);
        } else {
            server = http.createServer(app).listen(conf.listenPort, conf.ip);
        }
        ///////////////////////////////////////////////////////////////////////////////
        // Setup Socket.IO Notification Service                                      //
        ///////////////////////////////////////////////////////////////////////////////
        notifierService.setup(server)
        console.log('connected to: %s:%s', conf.ip, conf.listenPort);
        return server;
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
    response.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Authorization, Accept, token');
    response.header('Access-Control-Allow-Methods', 'OPTIONS, GET, HEAD, POST, PUT, DELETE, TRACE, CONNECT');

    // intercept OPTIONS method
    if ('OPTIONS' === request.method) {
        response.status(200).end();
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
        AccountMdl.verify(token, function(error, expired, decoded) {
            if(error) {
                response.statusCode = 498;
                response.json({error: 'Invalid token !'});
            } else if(expired) {
                response.statusCode = 401;
                response.json({error: 'Token expired. You need to log in again.'});
            } else {
                request.user = decoded;
                return next();
            }
        });
    } else {
        response.statusCode = 401;
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
app.set('title', 'Apicat.us');
app.set('view engine', 'html');
app.set('views', __dirname + '/views');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(passport.session());
app.use(allowCrossDomain);
app.use(Throttle.throttle);
app.use(DigestCtl.digestRequest);
app.use(express.static(conf.staticPath));

switch(process.env.NODE_ENV) {
    case 'development':
        app.use(errorhandler({ dumpExceptions: true, showStack: true }));
        //app.use(express.logger());
    break;
    case 'test':
        app.use(errorhandler());
    break;
    case 'production':
        app.use(errorhandler());
    break;
}
///////////////////////////////////////////////////////////////////////////////
// Application rutes                                                         //
///////////////////////////////////////////////////////////////////////////////
app.get('/', function(request, response) {
    'use strict';
    response.sendFile('/index.html', { root: conf.staticPath });
});

///////////////////////////////////////////////////////////////////////////////
// Digestors CURD Management                                                 //
///////////////////////////////////////////////////////////////////////////////
// Collections
app.route('/digestors')
    .post(ensureAuthenticated, DigestorCtl.create)
    .get(ensureAuthenticated, DigestorCtl.read)
    .delete(ensureAuthenticated, DigestorCtl.deleteAll);
// Entities
app.route('/digestors/:id')
    .get(ensureAuthenticated, DigestorCtl.readOne)
    .put(ensureAuthenticated, DigestorCtl.updateOne)
    .delete(ensureAuthenticated, DigestorCtl.deleteOne)
app.route('/find/:id')
    .get(ensureAuthenticated, DigestorCtl.findEntityById);


///////////////////////////////////////////////////////////////////////////////
// Logs CRUD                                                                 //
///////////////////////////////////////////////////////////////////////////////
// Collections
app.route('/logs')
    .post(ensureAuthenticated, LogsCtl.create)
    .get(ensureAuthenticated, LogsCtl.read)
    .delete(ensureAuthenticated, LogsCtl.delete);
// Entities
app.route('/logs/:entity/:id')
    .delete(ensureAuthenticated, LogsCtl.delete);

///////////////////////////////////////////////////////////////////////////////
// User CRUD Methods & Servi                                                 //
///////////////////////////////////////////////////////////////////////////////
app.post('/user/signin', AccountCtl.signIn);
app.get('/user/signout', ensureAuthenticated, AccountCtl.signOut);

app.route('/user')
    .post(AccountCtl.create)
    .get(ensureAuthenticated, AccountCtl.read);
app.route('/user/:id')
    .get(ensureAuthenticated, AccountCtl.readOne)
    .put(ensureAuthenticated, AccountCtl.update)
    .delete(ensureAuthenticated, AccountCtl.delete);

app.post('/user/forgot', AccountCtl.resetToken);
app.post('/user/reset/:token', AccountCtl.resetPassword);
app.post('/user/changepassword', AccountCtl.changePassword);


///////////////////////////////////////////////////////////////////////////////
// Analytics                                                                 //
///////////////////////////////////////////////////////////////////////////////
/*
app.get('/metrics', ensureAuthenticated, Analytics.metrics);
app.get('/geo', ensureAuthenticated, Analytics.geo);
app.get('/languages', ensureAuthenticated, Analytics.languages);
app.get('/platform', ensureAuthenticated, Analytics.platform);
app.get('/contentlength', ensureAuthenticated, Analytics.contentLength);
app.get('/contentlength2', ensureAuthenticated, Analytics.contentLength2);
app.get('/performance', ensureAuthenticated, Analytics.performance);
app.get('/metrics/:id', ensureAuthenticated, Analytics.metricsNew);
app.get('/summary', ensureAuthenticated, Analytics.summaryStats);
app.get('/getBytesTransferred/:id', ensureAuthenticated, Analytics.getBytesTransferred);
*/

// route middleware to validate :entity
app.param('entity', function(request, response, next, entity) {
    if(['digestor', 'method'].indexOf(entity) > -1) {
        next();
    } else {
        response.statusCode = 422;
        return response.json({"title": "error", "message": "Unprocessable Entity", "status": "fail"});
    }
});

app.get('/summary', ensureAuthenticated, Analytics.summary);
app.get('/transferstatistics/:entity/:id', Analytics.transferStatistics);

app.get('/unique', ensureAuthenticated, Analytics.unique);
app.get('/unique/:entity/:id', ensureAuthenticated, Analytics.unique);
app.get('/transfer/:entity/:id', ensureAuthenticated, Analytics.transfer2Statistics);
app.get('/transfer', ensureAuthenticated, Analytics.transfer2Statistics);
app.get('/geo2stats', ensureAuthenticated, Analytics.geo2stats);
app.get('/geo2stats/:entity/:id', ensureAuthenticated, Analytics.geo2stats);
app.get('/methodstatsbydate', ensureAuthenticated, Analytics.methodStatsByDate);
app.get('/methodstatsbydate/:entity/:id', ensureAuthenticated, Analytics.methodStatsByDate);

app.get('/geo', ensureAuthenticated, Analytics.geoStatistics);
app.get('/geo/:entity/:id', ensureAuthenticated, Analytics.geoStatistics);
app.get('/lang', ensureAuthenticated, Analytics.languageStatistics);
app.get('/lang/:entity/:id', ensureAuthenticated, Analytics.languageStatistics);
app.get('/agent', ensureAuthenticated, Analytics.agentStatistics);
app.get('/agent/:entity/:id', ensureAuthenticated, Analytics.agentStatistics);

app.get('/agenthistory', ensureAuthenticated, Analytics.agentStatsByDate);
app.get('/agenthistory/:entity/:id', ensureAuthenticated, Analytics.agentStatsByDate);


app.get('/throttle', Throttle.throttle, function(req, res) {
    res.json({message: "hello throttle"});
});


app.get('/echo', function(req, res) {
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


exports.app = init();

///////////////////////////////////////////////////////////////////////////////
// Gracefully Shuts down the workers.
///////////////////////////////////////////////////////////////////////////////
process
    .on('SIGTERM', function () {
        'use strict';

        console.log('SIGTERM');
        exports.app.close(function () {
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
        exports.app.close(function () {
            mongoose.connection.close(function () {
                process.exit(1);
            });
        });
    });


