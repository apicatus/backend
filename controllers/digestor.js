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

// Controllers
var mongoose = require('mongoose'),
    url = require('url')
    jsonValidator = require('tv4');

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
exports.read = function (request, response, next) {
    'use strict';

    var token = request.headers.token;
    var defaults = {
        skip : 0,
        limit : 0
    };

    Digestor.find({$or: [{public: true}, {owners: {$in: [request.user._id]}}, {_id: { $in: request.user.digestors }}]})
    .limit(defaults.limit)
    .skip(defaults.skip)
    .exec(function(error, digestors) {
        if (error) {
            response.statusCode = 500;
            return next(error);
        }
        if(!digestors) {
            response.statusCode = 404;
            return response.json({"title": "error", "message": "Not Found", "status": "fail"});
        }
        return response.json(digestors);
    });
};

///////////////////////////////////////////////////////////////////////////////
// Route to a get Digestor                                                   //
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

    Digestor.findOne({$and: [{_id: request.params.id}, {owners: {$in: [request.user._id]}}]})
    .exec(function(error, digestors) {
        if (error) {
            response.statusCode = 500;
            return next(error);
        }
        if(!digestors) {
            response.statusCode = 404;
            return response.json({"title": "error", "message": "Not Found", "status": "fail"});
        }
        return response.json(digestors);
    });
};

///////////////////////////////////////////////////////////////////////////////
// Route to a get Digestor                                                   //
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
exports.findEntityById = function(request, response, next) {
    Digestor.findOne({
        $and: [
            {
                owners: {$in: [request.user._id]}
            }, {
                $or: [
                    {'_id': request.params.id},                             // Digestors
                    {'endpoints._id': {$in: [request.params.id]}},          // Endpoints
                    {'endpoints.methods._id': {$in: [request.params.id]}}   // Methods
                ]
            }
        ]
    })
    .exec(function(error, entity) {
        if (error) {
            response.statusCode = 500;
            return next(error);
        }
        if(!entity) {
            response.statusCode = 404;
            return response.json({"title": "error", "message": "Not Found", "status": "fail"});
        }
        return response.json(entity);
    });
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

    // Fail if digestor name is already created
    // TODO: Digestor names can be duplicated but domains cannot !
    Digestor.findOne({name: request.body.name}, function(error, digestor) {
        if (error || digestor) {
            response.statusCode = 409;
            return response.json({error: "existingDigestor", message: 'Digestor already exists'});
        }
        digestor = new Digestor({
            name: request.body.name,
            synopsis: request.body.synopsis,
            subdomain: request.body.subdomain,
            created: new Date(),
            lastUpdate: new Date(),
            lastAccess: new Date(),
            endpoints: request.body.endpoints || [],
            owners: [request.user._id]
        });
        digestor.save(onSave);
        function onSave(error, digestor) {
            if (error || !digestor) {
                console.log("onSave error", error);
                return next(error);
            }
            request.user.digestors.push(digestor._id);
            request.user.save(function(error, user){
                if (error) {
                    request.user.digestors.pop();
                    console.log("save error", error);
                    return next(error);
                }
                response.statusCode = 201;
                return response.json(digestor);
            });
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

    delete request.body._id;
    Digestor.findOneAndUpdate({$and: [{_id: request.params.id}, {owners: request.user._id}]}, request.body)
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

    var index = request.user.digestors.indexOf(request.params.id);
    if(index < 0) {
        response.statusCode = 403;
        return response.json({action: 'deleteOne', result: false});
    }
    Digestor.findOneAndRemove({$and: [{_id: request.params.id}, {owners: request.user._id}]})
    .exec(function (error, digestor) {
        if (error) {
            response.statusCode = 500;
            return next(error);
        }
        return response.json(digestor);

        request.user.digestors.splice(index, 1);
        request.user.save(function(error, user){
            if (error) {
                console.log("save error", error);
                return next(error);
            }
            request.user.digestors = user.digestors;
            response.statusCode = 204;
            return response.json({action: 'deleteOne', result: true});
        });
    });
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

    Digestor.find({owners: request.user._id}).remove(function(error) {
        if (error) {
            response.statusCode = 500;
            return next();
        }
        user.digestors = [];
        user.save(function(error, user){
            if (error) {
                console.log("save error", error);
                return next(error);
            }
            request.user.digestors = user.digestors;
            response.statusCode = 204;
            return response.json({action: 'deleteOne', result: true});
        });
    });
};

