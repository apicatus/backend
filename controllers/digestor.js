///////////////////////////////////////////////////////////////////////////////
// @file         : digestor.js                                               //
// @summary      : Digestor controller                                       //
// @version      : 0.1                                                       //
// @project      : mia.pi                                                    //
// @description  :                                                           //
// @author       : Benjamin Maggi                                            //
// @email        : benjaminmaggi@gmail.com                                   //
// @date         : 6 Oct 2013                                                //
// ------------------------------------------------------------------------- //
//                                                                           //
// @copyright Copyright 2013 Benjamin Maggi, all rights reserved.            //
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
var mongoose = require('mongoose');

// Load model
var digestor_schema = require('../models/digestor'),
    Digestor = mongoose.model('Digestor', digestor_schema);

// Load Account model
var account_schema = require('../models/account'),
    Account = mongoose.model('Account', account_schema);

///////////////////////////////////////////////////////////////////////////////
// Route to get all Digestors                                                //
//                                                                           //
// @param {Object} request                                                   //
// @param {Object} response                                                  //
// @param {Object} next                                                      //
// @return {Object} JSON Collection of Digestors                             //
//                                                                           //
// @api public                                                               //
//                                                                           //
// @url GET /digestor/getall                                                 //
///////////////////////////////////////////////////////////////////////////////
exports.readAll = function (request, response, next) {
    'use strict';

    response.contentType('application/json');
    Digestor.find(gotDigestors).limit(10);

    function gotDigestors(err, digestors) {
        if (err) {
            console.log(err);
            return next();
        }
        if(!digestors) {
            response.statusCode = 404;
            var errJSON = JSON.stringify({"title": "error", "message":"Not Found", "status":"fail"});
            return response.send(errJSON);
        }
        var digestorsJSON = JSON.stringify(digestors);
        return response.send(digestorsJSON);
    }
};

///////////////////////////////////////////////////////////////////////////////
// Route to a specific Digestor                                              //
//                                                                           //
// @param {Object} request                                                   //
// @param {Object} response                                                  //
// @param {Object} next                                                      //
// @return {Object} JSON Digestor                                            //
//                                                                           //
// @api public                                                               //
//                                                                           //
// @url GET /digestor/getbyid                                                //
///////////////////////////////////////////////////////////////////////////////
exports.readOne = function (request, response, next) {
    'use strict';

    response.contentType('application/json');
    Digestor.findOne({name: request.params.name}, onRead);

    function onRead(err, digestor) {
        if (err) {
            return next(err);
        }
        if(!digestor) {
            response.statusCode = 404;
            var errJSON = JSON.stringify({"title": "error", "message":"Not Found","status":"fail"});
            return response.send(errJSON);
        }
        var digestorJSON = JSON.stringify(digestor);
        return response.send(digestorJSON);
    }
};

///////////////////////////////////////////////////////////////////////////////
// Route to add a Digestor                                                   //
//                                                                           //
// @param {Object} request                                                   //
// @param {Object} response                                                  //
// @param {Object} next                                                      //
// @return {Object} JSON result                                              //
//                                                                           //
// @api public                                                               //
//                                                                           //
// @url POST /digestors                                                      //
///////////////////////////////////////////////////////////////////////////////
exports.create = function (request, response, next) {
    'use strict';

    response.contentType('application/json');
    var token = request.headers.token;

    if(!token) {
        response.status(403);
        response.json({error: 'No auth token received !'});
    }
    // Fail if digestor name is already created
    Digestor.findOne({name: request.body.name}, function(error, digestor) {
        if (error || digestor) {
            response.status(409);
            var message = JSON.stringify({error: "existingDigestor", message: 'Digestor already exists'});
            return response.send(message);
        }
        digestor = new Digestor({
            name: request.body.name,
            created: new Date(),
            lastUpdate: new Date(),
            lastAccess: new Date(),
            endpoints: request.body.endpoints || [],
            owners: []
        });

        digestor.save(onSave);

        function onSave(error, digestor) {
            if (error || !digestor) {
                return next(error);
            }
            var decoded = Account.decode(token);
            if (decoded && decoded.email) {
                Account.findOne({email: decoded.email}, function(error, user) {
                    if (error || !user) {
                        return next(error);
                    } else if (token === user.token.token) {
                        // Verify if token has expired
                        user.digestors.push(digestor._id);
                        user.save(function(error, user){
                            if (error) {
                                return next(error);
                            }
                            digestor.owners.push(user._id);
                            digestor.save();
                            response.status(201);
                            return response.json(digestor);
                        });
                    }
                });
            } else {
                response.status(409);
                return response.json({error: 'Token could not be verified!'});
            }
            /*Account.findById(request.user._id, onFind);
            function onFind(error, account) {
                if (error) {
                    return next(error);
                }
                if (!account) {
                    return next(error);
                }
                account.digestors.push(digestor._id);
                account.save(onSaved);
                function onSaved(error, station) {
                    if (error) {
                        return next(error);
                    }
                    response.status(201);
                    return response.send(JSON.stringify(digestor));
                }
            }*/
            response.status(201);
            return response.send(JSON.stringify(digestor));
        }
    });
};

///////////////////////////////////////////////////////////////////////////////
// Route to update a Digestor                                                //
//                                                                           //
// @param {Object} request                                                   //
// @param {Object} response                                                  //
// @param {Object} next                                                      //
// @return {Object} JSON updated document                                    //
//                                                                           //
// @api public                                                               //
//                                                                           //
// @url PUT /digestors/:id                                                   //
///////////////////////////////////////////////////////////////////////////////
exports.updateOne = function (request, response, next) {
    'use strict';

    response.contentType('application/json');
    delete request.body._id;
    console.log("body: ", request.body.endpoints);
    /*Digestor.findOne({endpoints.methods.URI: request.body}, function(error, existingUser) {
        if (error || existingUser) {
            response.status(409);
            var message = JSON.stringify({error: "existingUser", message: 'User already exists'});
            return response.send(message);
        }
    });*/
    Digestor.findOneAndUpdate({_id: request.params.id}, request.body, onUpdate);

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
// Route to remove a Digestor                                                //
//                                                                           //
// @param {Object} request                                                   //
// @param {Object} response                                                  //
// @param {Object} next                                                      //
// @return {Object} JSON result                                              //
//                                                                           //
// @api public                                                               //
//                                                                           //
// @url GET /digestor/remove/:id                                             //
///////////////////////////////////////////////////////////////////////////////
exports.deleteOne = function (request, response, next) {
    'use strict';

    response.contentType('application/json');
    Digestor.findByIdAndRemove(request.body._id, deleteDigestor);
    function deleteDigestor (error) {
        if (error) {
            return next(error);
        }
        // The request was processed successfully, but no response body is needed.
        response.status(204);
        var message = JSON.stringify({});
        return response.send(message);
    }
};

///////////////////////////////////////////////////////////////////////////////
// Route to remove all Digestors                                             //
//                                                                           //
// @param {Object} request                                                   //
// @param {Object} response                                                  //
// @param {Object} next                                                      //
// @return {Object} JSON result                                              //
//                                                                           //
// @api public                                                               //
//                                                                           //
// @url GET /digestor/removeall                                              //
///////////////////////////////////////////////////////////////////////////////
exports.deleteAll = function (request, response, next) {
    'use strict';

    response.contentType('application/json');
    Digestor.find().remove(function(error) {
        if (error) {
            return next();
        }
        response.status(204);
        var msgJSON = JSON.stringify({action: 'deleteAll', result: true});
        return response.send(msgJSON);
    });
};

