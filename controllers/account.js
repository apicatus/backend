///////////////////////////////////////////////////////////////////////////////
// @file         : account.js                                                //
// @summary      : account controller                                        //
// @version      : 0.1                                                       //
// @project      : Node.JS + Express boilerplate for cloud9 and appFog       //
// @description  :                                                           //
// @author       : Benjamin Maggi                                            //
// @email        : benjaminmaggi@gmail.com                                   //
// @date         : 12 Dec 2012                                               //
// ------------------------------------------------------------------------- //
//                                                                           //
// @copyright Copyright 2012 Benjamin Maggi, all rights reserved.            //
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

// Controllers
var conf = require('../config'),
    mongoose = require('mongoose'),
    passport = require('passport'),
    GitHubStrategy = require('passport-github').Strategy,
    GitHubApi = require("github");

// Load model
var account_schema = require('../models/account'),
    Account = mongoose.model('Account', account_schema);

var GITHUB_CLIENT_ID = conf.oAuthServices.github.clientId;
var GITHUB_CLIENT_SECRET = conf.oAuthServices.github.clientSecret;

var github = new GitHubApi({
    // required
    version: "3.0.0",
    // optional
    debug: true,
    timeout: 5000
});


///////////////////////////////////////////////////////////////////////////////
// passport session setup & strategy                                         //
///////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////
// To support persistent login sessions, Passport needs to be able to        //
// serialize users into and deserialize users out of the session. Typically, //
// this will be as simple as storing the user ID when serializing, and       //
// finding the user by ID when deserializing.                                //
///////////////////////////////////////////////////////////////////////////////

passport.use(Account.createStrategy());
passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());

///////////////////////////////////////////////////////////////////////////////
// Use the GitHubStrategy within Passport.                                   //
// Strategies in Passport require a `verify` function, which accept          //
// credentials (in this case, an accessToken, refreshToken, and GitHub       //
// profile), and invoke a callback with a user object.                       //
///////////////////////////////////////////////////////////////////////////////

passport.use(new GitHubStrategy({
        clientID: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
        callbackURL: "http://" + conf.baseUrl + ":" + conf.listenPort + "/auth/github/callback",
        scope: ['user']
    },
    function(accessToken, refreshToken, profile, done) {
        'use strict';

        var user = {
            id: profile.username,
            email: (profile.emails.length) ? profile.emails[0].value : null,
            gravatar: profile._json.gravatar_id
        };
        console.log("user: ", user);
        console.log("token: ", accessToken);
        // asynchronous verification, for effect...
        process.nextTick(function () {
            // To keep the example simple, the user's GitHub profile is returned to
            // represent the logged-in user.  In a typical application, you would want
            // to associate the GitHub account with a user record in your database,
            // and return that user instead.
            return done(null, profile);
        });
    }
));
///////////////////////////////////////////////////////////////////////////////
// Route to Account signin                                                   //
//                                                                           //
// @param {Object} request                                                   //
// @param {Object} response                                                  //
// @param {Object} next                                                      //
// @return {Object} JSON Account                                             //
//                                                                           //
// @api public                                                               //
//                                                                           //
// @url GET /account/signin                                                  //
///////////////////////////////////////////////////////////////////////////////
exports.signIn = function(request, response, next) {
    'use strict';
    passport.authenticate('local', { session: false }, function(error, user) {
        if (error) {
            response.statusCode = 500;
            return next(error);
        }
        if (user) {
            Account.createUserToken(user.email, function(error, token) {
                if (error || !token) {
                    response.statusCode = 500;
                    response.json({error: 'Issue generating token'});
                } else {
                    response.json(user);
                }
            });
        } else {
            response.statusCode = 401;
            return response.json({error: 'unauthorized'});
        }
    })(request, response, next);
};

///////////////////////////////////////////////////////////////////////////////
// Route to get currently authenticated Account                              //
//                                                                           //
// @param {Object} request                                                   //
// @param {Object} response                                                  //
// @param {Object} next                                                      //
// @return {Object} JSON authenticated account                               //
//                                                                           //
// @api public                                                               //
//                                                                           //
// @url GET /account/getAccount                                              //
///////////////////////////////////////////////////////////////////////////////
exports.read = function(request, response, next) {
    'use strict';
    response.contentType('application/json');
    var incomingToken = request.headers.token;
    var decoded = Account.decode(incomingToken);

    if (decoded && decoded.email) {
        Account.findUser(decoded.email, incomingToken, function(error, user) {
            if (error || !user) {
                response.statusCode = 500;
                return next(error);
            } else {
                return response.json(user);
            }
        });
    } else {
        response.statusCode = 500;
        response.json({error: 'Issue decoding incoming token.'});
    }
};

///////////////////////////////////////////////////////////////////////////////
// Route to create a new Account                                             //
//                                                                           //
// @param {Object} request                                                   //
// @param {Object} response                                                  //
// @param {Object} next                                                      //
// @return {Object} JSON newly created account                               //
//                                                                           //
// @api public                                                               //
//                                                                           //
// @url GET /account/createAccount                                           //
///////////////////////////////////////////////////////////////////////////////
exports.create = function(request, response, next) {
    'use strict';
    response.contentType('application/json');
    var username = request.body.username;
    console.log(request.body);
    Account.findOne({username: username}, function(error, user) {
        if (error) {
            response.statusCode = 500;
            return next(error);
        } else if (user) {
            response.statusCode = 409;
            return response.json({error: "existingUser", message: 'User already exists'});
        }
        var account = new Account({ username : request.body.username, email: request.body.email});
        account.setPassword(request.body.password, function(error) {
            if (error) {
                response.statusCode = 500;
                return next(error);
            }
            account.save(function(error, account) {
                if (error || !account) {
                    response.statusCode = 500;
                    return response.json({error: "faultSave", message: 'Cannot save user'});
                }
                response.statusCode = 201;
                return response.json(account);
            });
        });
    });
};

///////////////////////////////////////////////////////////////////////////////
// Route to update an Account                                                //
//                                                                           //
// @param {Object} request                                                   //
// @param {Object} response                                                  //
// @param {Object} next                                                      //
// @return {Object} JSON updated account                                     //
//                                                                           //
// @api public                                                               //
//                                                                           //
// @url POST /account/update/:id                                             //
///////////////////////////////////////////////////////////////////////////////
exports.update = function(request, response, next) {
    'use strict';
    response.contentType('application/json');
    delete request.body._id;
    Account.findByIdAndUpdate(request.user._id, request.body, onUpdate);

    function onUpdate (error, account) {
        if (error) {
            response.statusCode = 500;
            return next(error);
        }
        if (!account) {
            return next(error);
        }
        response.status(200);
        var accountJSON = JSON.stringify(account);
        return response.send(accountJSON);
    }
};

///////////////////////////////////////////////////////////////////////////////
// Route to remove an Account                                                //
//                                                                           //
// @param {Object} request                                                   //
// @param {Object} response                                                  //
// @param {Object} next                                                      //
// @return {Object} JSON updated account                                     //
//                                                                           //
// @api public                                                               //
//                                                                           //
// @url DELETE /users                                                        //
///////////////////////////////////////////////////////////////////////////////
exports.delete = function(request, response, next) {
    'use strict';

    Account.findByIdAndRemove(request.user._id, onDelete);
    function onDelete (error) {
        if (error) {
            response.statusCode = 500;
            return next(error);
        }
        // The request was processed successfully, but no response body is needed.
        response.statusCode = 204;
        return response.json({});
    }
};

exports.token = function(request, response, next) {
    'use strict';

    passport.authenticate('local', { session: false }, function(error, user) {
        if (error) {
            response.statusCode = 500;
            return next(error);
        }
        if (user) {
            Account.createUserToken(request.user.email, function(error, token) {
                if (error || !token) {
                    response.statusCode = 500;
                    response.json({error: 'Issue generating token'});
                } else {
                    response.json({token : token});
                }
            });
        } else {
            response.statusCode = 401;
            return response.json({error: 'unauthorized'});
        }
    })(request, response, next);
};

///////////////////////////////////////////////////////////////////////////////
// Use the GitHubStrategy within Passport.                                   //
// Strategies in Passport require a `verify` function, which accept          //
// credentials (in this case, an accessToken, refreshToken, and GitHub       //
// profile), and invoke a callback with a user object.                       //
///////////////////////////////////////////////////////////////////////////////

passport.use(new GitHubStrategy({
        clientID: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
        callbackURL: "http://miapi.com:8080/auth/github/callback",
        scope: ['user']
    },
    function(accessToken, refreshToken, profile, done) {
        'use strict';

        console.log("token: ", accessToken);
        // OAuth2
        github.authenticate({
            type: "oauth",
            token: accessToken
        });
        github.user.getEmails({}, function(err, res) {
            console.log("email from github:", JSON.stringify(res[0]));

        var user = {
            username: profile.username,
            email: res[0],
            avatar: profile._json.avatar_url,
            company: profile._json.company,
            country: profile._json.location,
            oAuth: {
                token: accessToken
            }
        };
        console.log("user: ", user);
            Account.findOrCreate({ email: user.email }, user, function (error, user) {
                return done(error, user);
            });
        });


        // asynchronous verification, for effect...
        //process.nextTick(function () {
            // To keep the example simple, the user's GitHub profile is returned to
            // represent the logged-in user.  In a typical application, you would want
            // to associate the GitHub account with a user record in your database,
            // and return that user instead.
            //return done(null, profile);
        //});
    }
));

exports.githubAuth = function(request, response, next) {
    'use strict';
    passport.authenticate('github', function(request, response, next) {
        // The request will be redirected to GitHub for authentication, so this
        // function will not be called.
    })(request, response, next);
};
exports.githubAuthCallback = function(request, response, next) {
    'use strict';

    passport.authenticate('github', { session: false }, function(error, user) {
        if (error) {
            response.statusCode = 500;
            return next(error);
        }
        if (user) {
            console.log("githubAuthCallback user:", JSON.stringify(request.user, null, 4));
            //console.log("github user:", JSON.stringify(user, null, 4));
            Account.createUserToken(user.email, function(error, token) {
                if (error || !token) {
                    response.statusCode = 500;
                    response.json({error: 'Issue generating token'});
                } else {
                    response.json(user);
                }
            });
        } else {
            response.statusCode = 401;
            return response.json({error: 'unauthorized'});
        }
    })(request, response, next);
};


