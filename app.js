///////////////////////////////////////////////////////////////////////////////
// Module dependencies.                                                      //
///////////////////////////////////////////////////////////////////////////////
var express = require('express'),
    mongoose = require('mongoose'),
    conf = require('./config'),
    AccountMdl = require('./models/account'),
    AccountCtl = require('./controllers/account'),
    DigestorCtl = require('./controllers/digestor'),
    LogsCtl = require('./controllers/logs'),
    passport = require('passport'),
    DigestCtl = require('./controllers/digest'),
    Importer = require('./controllers/importer');

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

    if(conf.autoStart) {
        var mongoUrl = generateMongoUrl(conf.mongoUrl);
        console.log('mongodb connet to', mongoUrl);
        // Connect mongoose
        mongoose.connect(mongoUrl);
        // Check if connected
        mongoose.connection.on('open', function(){
            console.log('mongodb connected to: %s', mongoUrl);
        });
        var server = require('http').createServer(app);
        server.listen(conf.listenPort, conf.ip);
        console.log(conf.listenPort, conf.ip);
    }
};

///////////////////////////////////////////////////////////////////////////////
// Run app                                                                   //
///////////////////////////////////////////////////////////////////////////////
var app = express();

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
        AccountMdl.verify(token, function(error, isValid) {
            if(error || !isValid) {
                response.statusCode = 403;
                response.json({error: 'Invalid token !'});
            } else {
                return next();
            }
        });
    } else {
        console.log("req:", request.accepts('html'));
        if(request.accepts('html')) {
            console.log("llego x html");
            response.redirect(conf.baseUrl + '/login');
            //response.contentType('text/html');
            //response.sendfile(conf.staticPath + '/index.html');
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
    //app.use(express.vhost('*.miapi.com', require('./test/test').test));
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
// Digestors Resource Management                                             //
///////////////////////////////////////////////////////////////////////////////
// Collections
app.post('/digestors', DigestorCtl.create);
app.get('/digestors', ensureAuthenticated, DigestorCtl.read);
//app.put('/digestors', DigestorCtl.updateAll);
app.delete('/digestors', DigestorCtl.deleteAll);
// Entities
app.get('/digestors/:name', ensureAuthenticated, DigestorCtl.readOne);
app.put('/digestors/:id', ensureAuthenticated, DigestorCtl.updateOne);
app.delete('/digestors/:name', ensureAuthenticated, DigestorCtl.deleteOne);


///////////////////////////////////////////////////////////////////////////////
// Logs CRUD                                                                 //
///////////////////////////////////////////////////////////////////////////////
app.post('/logs', LogsCtl.create);
app.get('/logs', LogsCtl.read);
app.put('/logs/:id', LogsCtl.update);
app.delete('/logs/:id', LogsCtl.delete);

///////////////////////////////////////////////////////////////////////////////
// Application rutes                                                         //
///////////////////////////////////////////////////////////////////////////////
app.get('/', ensureAuthenticated, function(request, response) {
    'use strict';
    response.sendfile(conf.staticPath + '/index.html');
});
///////////////////////////////////////////////////////////////////////////////
// User CRUD Methods & Servi                                                 //
///////////////////////////////////////////////////////////////////////////////
app.post('/user/signin', AccountCtl.signIn);
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
// socket.io                                                                 //
///////////////////////////////////////////////////////////////////////////////

init();
exports.app = app;
//module.exports = app;

