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
var mongoose = require('mongoose'),
    passport = require('passport');

// Load model
var account_schema = require('../models/account'),
    Account = mongoose.model('Account', account_schema);


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
    response.contentType('application/json');
    passport.authenticate('local', { session: false }, function(error, user, info) {
        if (error) {
            response.status(503);
            return next(err);
        }
        if (user) {
            Account.createUserToken(user.email, function(error, usersToken) {
                if (error) {
                    response.send({error: 'Issue generating token'});
                } else {

                    response.send(user);
                }
            });
        } else {
            response.status(401);
            return response.send({error: 'unauthorized'});
        }
        /*request.logIn(user, function(err) {
            if (err) {
                response.status(503);
                return next(err);
            }
            // User has authenticated
            return response.send(JSON.stringify({username: request.user.username}));
        });*/
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
            if (error) {
                response.status(404);
                response.json({error: 'Issue finding user.'});
            } else {
                return response.json(user);
            }
        });
    } else {
        response.status(500);
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
    Account.findOne({username: username}, function(error, existingUser) {
        if (error || existingUser) {
            response.status(409);
            var message = JSON.stringify({error: "existingUser", message: 'User already exists'});
            return response.send(message);
        }
        var account = new Account({ username : request.body.username, email: request.body.email});
        account.setPassword(request.body.password, function(error) {
            if (error) {
                return response.render('signup', { account : account });
            }
            account.save(function(error) {
                if (error) {
                    var message = JSON.stringify({error: "faultSave", message: 'Cannot save user'});
                    return response.send(message);
                }
                response.status(201);
                var message = JSON.stringify(account);
                return response.send(message);
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
exports.update = function (request, response, next) {
    'use strict';
    response.contentType('application/json');
    delete request.body._id;
    Account.findByIdAndUpdate(request.user._id, request.body, onUpdate);

    function onUpdate (error, account) {
        if (error) {
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
exports.delete = function (request, response, next) {
    'use strict';
    response.contentType('application/json');
    Account.findByIdAndRemove(request.user._id, onDelete);
    function onDelete (error, account) {
        if (error) {
            return next(error);
        }
        request.logout();
        // The request was processed successfully, but no response body is needed.
        response.status(204);
        var message = JSON.stringify({});
        return response.send(message);
    }
};

exports.token = function (request, response, next) {
    'use strict';
    response.contentType('application/json');
    passport.authenticate('local', { session: false }, function(error, user, info) {
        if (error) {
            response.status(503);
            return next(err);
        }
        if (user) {
            Account.createUserToken(request.user.email, function(error, usersToken) {
                if (error) {
                    response.send({error: 'Issue generating token'});
                } else {
                    response.send({token : usersToken});
                }
            });
        } else {
            response.status(401);
            return response.send({error: 'unauthorized'});
        }
    })(request, response, next);
};



