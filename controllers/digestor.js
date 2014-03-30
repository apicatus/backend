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
var mongoose = require('mongoose'),
    url = require('url');

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
// @url GET /digestor                                                        //
///////////////////////////////////////////////////////////////////////////////

/*
    TODO:
        * Make simple API call handle both [/digestors and /digestors/:id]
        * Dont allow private API search
*/
exports.read = function (request, response, next) {
    'use strict';

    var token = request.headers.token;
    var defaults = {
        skip : 0,
        limit : 0
    };
    var query = url.parse(request.url, true).query;
    // Remove defauls from query object
    for(var key in defaults) {
        if(defaults.hasOwnProperty(key)) {
            defaults[key] = parseInt(query[key], 10);
            delete query[key];
        }
    }
    Account.findUserByToken(token, gotUser);
    function gotUser(error, user) {
        if (error) {
            response.statusCode = 500;
            return next();
        }
        query.owners = user._id;
        Digestor
        .find({$or: [query, {public: true}]}) //
        .limit(defaults.limit)
        .skip(defaults.skip)
        .exec(function(error, digestors) {
            if (error) {
                response.statusCode = 500;
                return next();
            }
            if(!digestors) {
                response.statusCode = 404;
                var errJSON = JSON.stringify({"title": "error", "message": "Not Found", "status": "fail"});
                return response.json(errJSON);
            }
            return response.json(digestors);
        });
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
// @url GET /digestor/:id                                                    //
///////////////////////////////////////////////////////////////////////////////
exports.readOne = function (request, response, next) {
    'use strict';

    var token = request.headers.token;

    function gotUser(error, user) {
        if (error || !user) {
            response.statusCode = 500;
            return next();
        }
        Digestor
        .findOne({$and: [{name: request.params.name}, {owners: user._id}]}) //
        .exec(function(error, digestor) {
            if (error) {
                response.statusCode = 500;
                return next();
            }
            if(!digestor) {
                response.statusCode = 404;
                return response.json({"title": "error", "message": "Not Found", "status": "fail"});
            }
            return response.json(digestor);
        });
    }
    Account.findUserByToken(token, gotUser);
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

    var token = request.headers.token;

    function gotUser(error, user) {
        if (error || !user) {
            response.statusCode = 500;
            return next();
        }
        Digestor.findOneAndUpdate({$and: [{name: request.params.name}, {owners: user._id}]}, request.body)
        .exec(function (error, digestor) {
            if (error) {
                response.statusCode = 500;
                return next(error);
            }
            if (!digestor) {
                response.statusCode = 404;
                return response.json({"title": "error", "message": "Not Found", "status": "fail"});
            }
            return response.json(digestor);
        });
    }
    Account.findUserByToken(token, gotUser);
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

    var token = request.headers.token;

    function gotUser(error, user) {
        if (error || !user) {
            response.statusCode = 500;
            return next();
        }
        Digestor.findOneAndRemove({$and: [{name: request.params.name}, {owners: user._id}]})
        .exec(function (error) {
            if (error) {
                response.statusCode = 500;
                return next(error);
            } else {
                response.statusCode = 204;
                return response.json({});
            }
        });
    }
    Account.findUserByToken(token, gotUser);
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

    var token = request.headers.token;

    function gotUser(error, user) {
        if (error || !user) {
            response.statusCode = 500;
            return next();
        }
        Digestor.find({owners: user._id}).remove(function(error) {
            if (error) {
                response.statusCode = 500;
                return next();
            }
            response.statusCode = 204;
            return response.json({action: 'deleteAll', result: true});
        });
    }
    Account.findUserByToken(token, gotUser);
};

