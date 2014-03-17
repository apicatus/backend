///////////////////////////////////////////////////////////////////////////////
// @file         : importer.js                                               //
// @summary      : Importer controller                                       //
// @version      : 0.1                                                       //
// @project      : apicat.us                                                 //
// @description  :                                                           //
// @author       : Benjamin Maggi                                            //
// @email        : benjaminmaggi@gmail.com                                   //
// @date         : 15 Mar 2014                                               //
// ------------------------------------------------------------------------- //
//                                                                           //
// @copyright Copyright 2013~2014 Benjamin Maggi, all rights reserved.       //
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

var mongoose = require('mongoose');
// Language parsers
var protagonist = require('protagonist');
var raml = require('raml-parser');
// Load model
var digestor_schema = require('../models/digestor'),
    Digestor = mongoose.model('Digestor', digestor_schema);
// Load Account model
var account_schema = require('../models/account'),
    Account = mongoose.model('Account', account_schema);
///////////////////////////////////////////////////////////////////////////////
// Imports a RAML Descriptor                                                 //
//                                                                           //
// @param {Object} request                                                   //`
// @param {Object} response                                                  //
// @param {Object} next                                                      //
// @return {Object} JSON result                                              //
//                                                                           //
// @api public                                                               //
//                                                                           //
// @url POST /import/raml                                                    //
///////////////////////////////////////////////////////////////////////////////
exports.raml = function (request, response, next) {
    'use strict';

    raml.load(request.body).then(function(result) {
        console.log(result);
    }, function(error) {
        console.log('Error parsing: ' + error);
        return next(error);
    });
};

///////////////////////////////////////////////////////////////////////////////
// Imports an API Blueprint                                                  //
//                                                                           //
// @param {Object} request                                                   //
// @param {Object} response                                                  //
// @param {Object} next                                                      //
// @return {Object} JSON result                                              //
//                                                                           //
// @api public                                                               //
//                                                                           //
// @url POST /import/blueprint                                               //
///////////////////////////////////////////////////////////////////////////////
exports.blueprint = function (request, response, next) {
    'use strict';

    var token = request.headers.token;
    protagonist.parse(request.body, function(error, result) {
        if (error) {
            console.log('Error parsing: ' + error);
            response.statusCode = 500;
            return next(error);
        }
        console.log(result.ast);
        response.json(result.ast);
    });

    // Fail if digestor name is already created (better cheche domains and assign a new one)
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
            response.status(201);
            return response.send(JSON.stringify(digestor));
        }
    });
};


