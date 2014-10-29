///////////////////////////////////////////////////////////////////////////////
// @file         : logger.js                                                 //
// @summary      : Logger controller                                         //
// @version      : 0.1                                                       //
// @project      : apicat.us                                                 //
// @description  :                                                           //
// @author       : Benjamin Maggi                                            //
// @email        : benjaminmaggi@gmail.com                                   //
// @date         : 5 Mar 2014                                                //
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
    url = require('url'),
    freegeoip = require('../services/freegeoip'),
    geoip = require('geoip-lite'),
    config = require('../config'),
    elasticsearch = require('elasticsearch');

// Load model
var logs_schema = require('../models/logs'),
    Logs = mongoose.model('Logs', logs_schema);

var logs_mapping = require('../models/logs.mapping.json')
var client = new elasticsearch.Client();

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
// @url GET /logs/                                                           //
///////////////////////////////////////////////////////////////////////////////
exports.read = function (request, response, next) {
    'use strict';

    var defaults = {
        skip : 0,
        limit : 0,
        digestor: '',
        method: ''
    };
    var query = url.parse(request.url, true).query;
    var since, until;
    // Very crude ISO-8601 date pattern matching
    var isoDate = /^(\d{4})(?:-?W(\d+)(?:-?(\d+)D?)?|(?:-(\d+))?-(\d+))(?:[T ](\d+):(\d+)(?::(\d+)(?:\.(\d+))?)?)?(?:Z(-?\d*))?$/;

    if(query.since && query.until) {
        since = query.since.match(isoDate) ? query.since : parseInt(query.since, 10);
        until = query.until.match(isoDate) ? query.until : parseInt(query.until, 10);
    } else {
        // If empty then select the last 24hs
        until = new Date();
        since = new Date().setHours(new Date().getHours() - 6);
    }

    console.log("query: ", query)
    client.search({
        index: 'logs',
        size: query.limit || 10,
        from: query.from || 0,
        body: {
            // Begin query.
            //fields: ["time", "date"],
            _source: [ 'date', 'ip', 'uri', 'status', 'time' ],
            query: {
                filtered: {
                    query: {
                        // Boolean query for matching and excluding items.
                        bool: {
                            should: [{
                                query_string: {
                                    query: "*"
                                }
                            }]
                        }
                    },
                    filter: {
                        bool: {
                            must: [{
                                range: {
                                    date: {
                                        from: since,
                                        to: until
                                    }
                                }
                            }],
                            should: [{
                                fquery: {
                                    query: {
                                        query_string: {
                                            query: "digestor:(" + query.digestor + ")"
                                        }
                                    }
                                }
                            }, 
                            {
                                fquery: {
                                    query: {
                                        query_string: {
                                            query: "method:(" + query.method + ")"
                                        }
                                    }
                                }
                            }]
                        }
                    }
                },
            },
            sort: [
                {
                    date: {
                        order: "desc", ignore_unmapped: true
                    }
                }
            ]
        }
    }).then(function (logs) {
        if(!logs.hits.hits.length) {
            response.statusCode = 404;
            return response.json({"title": "error", "message": "Not Found", "status": "fail"});
        }
        return response.json(logs.hits);
    }, function (error, body, code) {
        console.trace("error: ", error.message);
        if (error) throw new Error(error);
        response.statusCode = 500;
        return next(error);
    });
    /*
    Logs
    .find(query)
    .limit(defaults.limit)
    .skip(defaults.skip)
    .exec(function(error, logs) {
        if (error) {
            response.statusCode = 500;
            return next();
        }
        if(!logs) {
            response.statusCode = 404;
            return response.json({"title": "error", "message": "Not Found", "status": "fail"});
        }
        return response.json(logs);
    });
    */
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
// @url GET /logs/:id                                                        //
///////////////////////////////////////////////////////////////////////////////
exports.findBy = function (request, response, next) {
    'use strict';

    Logs.findOne({_id: request.params._id}, onFindOne);

    function onFindOne(error, log) {
        if (error) {
            return next(error);
        }
        if(!log) {
            response.statusCode = 404;
            return response.json({"title": "error", "message": "Not Found", "status": "fail"});
        }
        return response.json(log);
    }
};

var initIndex = function (client) {

    console.log("logs_mapping: ", logs_mapping);
    /*
    client.create({ 
        index: 'logs', 
        type: 'log' 
    });

    client.indices.putMapping({ 
        index: 'logs', 
        type: 'log', 
        body: body 
    }).then(function (response) {
        var hits = resp.hits.hits;
    }, function (error, body, code) {
        if (error) throw new Error(error);
    });
    */
};

///////////////////////////////////////////////////////////////////////////////
// Create a log and store it to elasticsearch                                //
//                                                                           //
// @param {Object} request                                                   //
// @param {Object} response                                                  //
// @param {Object} next                                                      //
// @return {Object} JSON result                                              //
//                                                                           //
// @api public                                                               //
//                                                                           //
// @url POST /logs                                                           //
///////////////////////////////////////////////////////////////////////////////
exports.create = function(request, response, next) {
    'use strict';

    var ip = request.headers['x-forwarded-for'] ||
        request.connection.remoteAddress ||
        request.socket.remoteAddress ||
        request.connection.socket.remoteAddress;

    var log = {
        ip: ip,
        uri: url.parse(request.url, true, true),
        requestHeaders: request.headers,
        requestBody: request.body,
        responseHeaders: {},
        responseBody: {},
        date: new Date(),
        status: 0,
        time: 0,
        geo: geoip.lookup('190.18.149.180')
    };

    function logRequest() {

        log.time = new Date().getTime() - log.date.getTime();
        log.responseHeaders = response._headers;
        log.status = response.statusCode;
        // Save to elasticsearch
        client.create({
            index: 'logs',
            type: 'log',
            id: mongoose.Types.ObjectId().toString(),
            body: log
        }).then(function (response) {
            return response;
        }, function (error, body, code) {
            console.trace("error: ", error.message);
            if (error) throw new Error(error);
        });
    }
    
    response.on('finish', logRequest);
    response.on('data', function (chunk) {
        log.responseBody += chunk;
    });
    response.on('end', function() {
    });
    response.on('header', function() {
    });
    return log;    
};
exports.createOLD = function (request, response, next) {
    'use strict';

    var ip = request.headers['x-forwarded-for'] ||
        request.connection.remoteAddress ||
        request.socket.remoteAddress ||
        request.connection.socket.remoteAddress;

    var log = new Logs({
        ip: ip,
        uri: url.parse(request.url, true, true),
        requestHeaders: request.headers,
        requestBody: request.body,
        responseHeaders: {},
        responseBody: {},
        status: 0,
        date: new Date(),
        time: 0
    });
    function onSave(error, log) {
        var report = null;
        if (error) {
            return next(error);
        }
        if(!log) {
            report = new Error('Error could not create log');
            report.status = 404;
            return next(report);
        }/*
        if(log) {
            console.log("LOG OK: ", log.toJSON());
            client.create({
                index: 'logs',
                type: 'log',
                id: log._id.toString(),
                body: log.toJSON()
            }, function (error, response) {
                console.log("response: ", response);
            });
        }*/
        //return next(log);
    }
    function logRequest() {
        log.time = new Date().getTime() - log.date.getTime();
        log.responseHeaders = response._headers;
        log.status = response.statusCode;
        // Convert content-length to numbers
        if(log.requestHeaders['content-length']) {
            log.requestHeaders['content-length'] = parseInt(log.requestHeaders['content-length'], 10);
        }
        if(log.responseHeaders['content-length']) {
            log.responseHeaders['content-length'] = parseInt(log.responseHeaders['content-length'], 10);
        }
        //log.responseBody = response.statusCode;
        freegeoip.getLocation(ip, function(err, geo) {
            log.geo = geo;
            log.save(onSave);
        });
        // console.log("response finish: ", log.time, "ms, length", response.getHeader('Content-Length'));
    }
    response.on('finish', logRequest);
    response.on('data', function (chunk) {
        log.responseBody += chunk;
        //console.log("chunk: ", chunk);
    });
    //response.end = function(data, encoding) {
    //    console.log("response.end()", data);
    //};
    response.on('end', function() {
        //console.log("on end: ", log.responseBody);
    });
    response.on('header', function() {
        //console.log("header: ", this);
    });
    return log;
};

///////////////////////////////////////////////////////////////////////////////
// Route to update a Log                                                     //
//                                                                           //
// @param {Object} request                                                   //
// @param {Object} response                                                  //
// @param {Object} next                                                      //
// @return {Object} JSON updated document                                    //
//                                                                           //
// @api public                                                               //
//                                                                           //
// @url PUT /logs/:id                                                        //
///////////////////////////////////////////////////////////////////////////////
exports.update = function (request, response, next) {
    'use strict';

    Logs.findOneAndUpdate({_id: request.params._id}, request.body, onUpdate);

    function onUpdate (error, log) {
        if (error) {
            return next(error);
        }
        if (!log) {
            response.statusCode = 500;
            return response.json({"title": "error", "message": "could not update", "status": "fail"});
        }
        response.status(200);
        return response.json(log);
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
// @url DELETE /logs/:id                                                     //
///////////////////////////////////////////////////////////////////////////////
exports.delete = function (request, response, next) {
    'use strict';

    if(request.params._id) {
        Logs.findOneAndRemove({_id: request.params._id}, onDelete);
    } else {
        // remove all
        Logs.find().remove(onDelete);
    }
    function onDelete(error) {
        if (error) {
            return next(error);
        }
        response.statusCode = 204;
        return response.json({action: 'delete', result: true});
    }
};
