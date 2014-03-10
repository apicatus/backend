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
    SocketIo = require('socket.io'),
    passport = require('passport'),
    DigestCtl = require('./controllers/digest');

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
var init = function(options) {
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
        var io = require('socket.io').listen(server);
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
    response.contentType('application/json');
    var token = request.headers.token;

    if(token) {
        AccountMdl.verify(token, function(error, isValid) {
            if(error || !isValid) {
                response.status(403);
                response.json({error: 'Invalid token !'});
            } else {
                return next();
            }
        });
    } else {
        response.status(403);
        response.json({error: 'No auth token received !'});
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
    app.use(express.cookieParser());
    app.use(express.session({ secret: conf.sessionSecret }));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(allowCrossDomain);
    app.use(app.router);
    app.use(DigestCtl.digestRequest);
    //app.use(express.vhost('*.miapi.com', require('./test/test').test));
    app.use(express.static(__dirname + conf.staticPath));
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
// passport setup & strategy                                                 //
///////////////////////////////////////////////////////////////////////////////
passport.use(AccountMdl.createStrategy());
passport.serializeUser(AccountMdl.serializeUser());
passport.deserializeUser(AccountMdl.deserializeUser());

///////////////////////////////////////////////////////////////////////////////
// Digestors Resource Management                                             //
///////////////////////////////////////////////////////////////////////////////
// Collections
app.post('/digestors', DigestorCtl.create);
app.get('/digestors', ensureAuthenticated, DigestorCtl.readAll);
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
app.get('/', function(request, response) {
    'use strict';
    response.sendfile(__dirname + '/frontend/build/index.html');
});
///////////////////////////////////////////////////////////////////////////////
// User CRUD Methods & Servi                                                 //
///////////////////////////////////////////////////////////////////////////////
app.post('/user/signin', AccountCtl.signIn);
app.get('/user/signout', ensureAuthenticated, function(request, response, next) {
    'use strict';
    response.contentType('application/json');
    request.logout();
    response.status(204);
    var message = JSON.stringify({});
    return response.send(message);
});
app.post('/user/forgot', function(request, response, next) {
    'use strict';
    var email = request.body.email;
});
app.post('/user', ensureAuthenticated, AccountCtl.create);
app.get('/user', ensureAuthenticated, AccountCtl.read);
app.put('/user', ensureAuthenticated, AccountCtl.update);
app.del('/user', ensureAuthenticated, AccountCtl.delete);
app.post('/token', ensureAuthenticated, AccountCtl.token);

///////////////////////////////////////////////////////////////////////////////
// socket.io                                                                 //
///////////////////////////////////////////////////////////////////////////////

init();
exports.app = app;
//module.exports = app;

