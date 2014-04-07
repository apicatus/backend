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
    var serialize = function (model) {
        //Digestor()
        var digestor = new Digestor({
            name: model.name,
            synopsis: model.description
        });


        var api = {
            name: model.ast.name,
            synopsis: model.ast.description
        };

        api.endpoints = model.ast.resourceGroups.map(function(resourceGroup, i){
            return resourceGroup.resources.map(function(resource, index){
                return {
                    name: resource.name,
                    synopsis: resource.description,
                    URI: resource.uriTemplate,
                    methods: resource.actions.map(function(action, index){
                        return {
                            method: action.method,
                            name: action.name,
                            synopsis: action.description,
                            URI: resource.uriTemplate,
                            parameters: action.parameters.map(function(parameter, index){
                                return {
                                    name: parameter.name,
                                    synopsis: parameter.description,
                                    type: parameter.type
                                };
                            }),
                            response: action.examples.map(function(example, index){
                                return example.responses.map(function(response, index){
                                    return {
                                        body: response.body,
                                        headers: response.headers,
                                        statusCode: response.name,
                                        synopsis: response.description
                                    };
                                })[0]
                            })[0] // <- Just the first response is to be evaluated
                        };
                    }),
                };
            });
        });
        return api;
    };
    protagonist.parse(request.body.blueprint, function(error, result) {
        if (error) {
            console.log('Error parsing: ' + error);
            response.statusCode = 500;
            return next(error);
        }
        console.log(result.ast);
        response.json(serialize(result));
    });

    return;
    // Fail if digestor name is already created (
    // TODO: check if domain extist and assign a new one
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

///////////////////////////////////////////////////////////////////////////////
// Test API Model                                                            //
//                                                                           //
// @param {Object} request                                                   //
// @param {Object} response                                                  //
// @param {Object} next                                                      //
// @return {Object} JSON result                                              //
//                                                                           //
// @api public                                                               //
//                                                                           //
// @url POST /import/test                                                    //
///////////////////////////////////////////////////////////////////////////////
exports.test = function (request, response, next) {
    'use strict';

    var token = request.headers.token;
    var testBlueprint = function(model) {
        protagonist.parse(model, function(error, result) {
            if (error) {
                console.log('Error parsing: ' + error);
                response.statusCode = 500;
                return next(error);
            }
            console.log(result.ast);
            response.json(result.ast);
        });
    };
    var testRaml = function(model) {
        raml.load(model).then(function(result) {
            console.log(result);
            response.json(result);
        }, function(error) {
            console.log('Error parsing: ' + error);
            response.statusCode = 500;
            return next(error);
        });
    };
    switch(request.body.format) {
        case 'blueprint':
            testBlueprint(request.body.model);
        break;
        case 'raml':
            testRaml(request.body.model);
        break;
    }
}


