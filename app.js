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
    FileSystem = require('fs'),
    util = require('util'),
    vm = require('vm'),
    url = require('url'),
    SocketIo = require('socket.io'),
    passport = require('passport'),
    jwt = require('jwt-simple'),
    LocalStrategy = require('passport-local').Strategy,
    DigestCtl = require('./controllers/digest');

////////////////////////////////////////////////////////////////////////////////
// Mongo URL generator                                                        //
////////////////////////////////////////////////////////////////////////////////
var generate_mongo_url = function(conf){
    if(conf.username && conf.password){
        return "mongodb://" + conf.username + ":" + conf.password + "@" + conf.hostname + ":" + conf.port + "/" + conf.db;
    }
    else{
        return "mongodb://" + conf.hostname + ":" + conf.port + "/" + conf.db;
    }
};
////////////////////////////////////////////////////////////////////////////////
// MongoDB Connection setup                                                   //
////////////////////////////////////////////////////////////////////////////////
var init = function(options) {
    if(conf.autoStart) {
        console.log("autostarting app")
        var mongoUrl = generate_mongo_url(conf.mongoUrl);
        console.log("mongodb connet to", mongoUrl);

        // Connect mongoose
        mongoose.connect(mongoUrl);
        // Check if connected
        mongoose.connection.on("open", function(){
            console.log("mongodb connected to: %s", mongoUrl);
        });
        var server = require('http').createServer(app);
        var io = require('socket.io').listen(server);
        server.listen(conf.listenPort, conf.ip);
        console.log(conf.listenPort, conf.ip);
    }
}

///////////////////////////////////////////////////////////////////////////////
// Run app                                                                   //
///////////////////////////////////////////////////////////////////////////////
var app = express();

///////////////////////////////////////////////////////////////////////////////
// CORS middleware (only to test on cloud9)                                  //
///////////////////////////////////////////////////////////////////////////////
var allowCrossDomain = function(request, response, next) {
    response.header('Access-Control-Allow-Origin', '*');
    response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, X-Level3-Digest-Time, Content-Type, Authorization, Accept");
    response.header('Access-Control-Allow-Methods', 'OPTIONS, GET, HEAD, POST, PUT, DELETE, TRACE, CONNECT');

    // intercept OPTIONS method
    if ('OPTIONS' == request.method) {
        response.send(200);
    }
    else {
        next();
    }
};
// reusable middleware to test authenticated sessions
function ensureAuthenticated(request, response, next) {
    response.contentType('application/json');
    var decoded = null;
    var incomingToken = request.headers.token;

    if(incomingToken) {
        AccountMdl.verify(incomingToken, function(error, isValid) {
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
app.configure(function(){
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
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    app.use(express.logger());
});
app.configure('testing', function() {
    app.use(express.errorHandler());
});
app.configure('production', function() {
    app.use(express.errorHandler());
});



///////////////////////////////////////////////////////////////////////////////
// passport setup & strategy                                                 //
///////////////////////////////////////////////////////////////////////////////
//passport.use(new LocalStrategy(Account.authenticate()));
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
    response.sendfile(__dirname + '/frontend/build/index.html');
});
///////////////////////////////////////////////////////////////////////////////
// User CRUD Methods & Servi                                                 //
///////////////////////////////////////////////////////////////////////////////
app.post('/user/signin', AccountCtl.signIn);
app.get('/user/signout', ensureAuthenticated, function(request, response, next) {
    response.contentType('application/json');
    request.logout();
    response.status(204);
    var message = JSON.stringify({});
    return response.send(message);
});
app.post('/user/forgot', function(req, res) {

    var email = req.body.email;
    //res.writeHead(401, {"Content-Type": "application/json"});
    res.contentType('application/json');

    Account.findOne({email : email }, function(err, existingUser) {
            if (err) {
                res.statusCode = 401;
                var retJSON = JSON.stringify({"message":"Error","status":"fail"});
                return res.send(retJSON);
            }
            else if (existingUser) {
                var retJSON = JSON.stringify({"message":"Error","status":"fail"});
                return res.send(retJSON);
            }
            else {
                // Invalid login/password
                //res.writeHead(401, {"Content-Type": "application/json"});
                //res.end(JSON.stringify({error:{type:"Unauthorized",message:"Wrong username and/or password.", code:"401"}}));
                res.statusCode = 401;
                var retJSON = JSON.stringify({"message":"Error","status":"Wrong username and/or password."});
                return res.send(retJSON);
            }
    });
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

