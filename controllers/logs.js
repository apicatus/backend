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
    geoip = require('geoip-lite'),
    uap = require('ua-parser'),
    device = require('../services/device'),
    elasticsearch = require('elasticsearch');

// Load model
var digestor_schema = require('../models/digestor'),
    Digestor = mongoose.model('Digestor', digestor_schema);

var logs_mapping = require('../models/logs.mapping.json');
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

    client.search({
        index: 'logs',
        size: query.limit || 10,
        from: query.from || 0,
        body: {
            //_source: [ 'date', 'ip', 'uri', 'status', 'time' ],
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
        responseHeaders: {},
        date: new Date(),
        status: 0,
        time: 0,
        data: {
            out: 0,
            in: Buffer.byteLength(JSON.stringify(request.body)) || 0
        },
        geo: geoip.lookup(ip),
        ua: uap.parse(request.headers['user-agent'])
    };
    log.ua.device.type = device.parse(request);

    function logRequest() {

        log.time = new Date().getTime() - log.date.getTime();
        log.responseHeaders = response._headers;
        log.status = response.statusCode;
        if(response.getHeader('Transfer-Encoding')) {
            console.log('------->>CHUNKED<<------');
            console.log("ENC: ", response.getHeader('Transfer-Encoding'));
            // TODO !!
            // Wont work for JSON Objects !!!!!
            console.log("SIZE: ", Buffer.byteLength(log.data.toString(), 'chunked'));
            console.log('------->>CHUNKED<<------');
        }
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
        log.data.out = chunk;
    });
    response.on('end', function() {
    });
    response.on('header', function() {
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

};

///////////////////////////////////////////////////////////////////////////////
// Route to remove Logs                                                      //
//                                                                           //
// @param {Object} request                                                   //
// @param {Object} response                                                  //
// @param {Object} next                                                      //
// @return {Object} JSON result                                              //
//                                                                           //
// @api public                                                               //
//                                                                           //
// @url DELETE /logs                                                         //
///////////////////////////////////////////////////////////////////////////////
exports.delete = function (request, response, next) {
    'use strict';

    var search = function() {
        var search = {
            "query": {
                "filtered" : {
                    "filter": {
                        "bool": {
                            "must": [],
                            "should": []
                        }
                    }
                }
            }
        };
        if(request.params.entity && request.params.id) {
            search.query.filtered.filter.bool.must.push({
                "fquery": {
                    "query": {
                        "query_string": {
                            "query": request.params.entity + ":" + request.params.id
                        }
                    },
                    "_cache": true
                }
            });
        } else {
            request.user.digestors.forEach(function(digestor, index) {
                search.query.filtered.filter.bool.should.push({
                    "fquery": {
                        "query": {
                            "query_string": {
                                "query": "digestor:" + digestor
                            }
                        },
                        "_cache": true
                    }
                });
            });
        }
        return search;
    };

    ///////////////////////////////////////////////////////////////////////////
    // It we have an entity and param id make sure we own then befor remove  //
    ///////////////////////////////////////////////////////////////////////////
    if(request.params.entity && request.params.id) {

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
            // Remove by query
            deleteByQuery(search());
        });

    } else {
        // Remove all our difestors logs
        deleteByQuery(search());
    }


    function deleteByQuery(query) {
        client.deleteByQuery({
            index: 'logs',
            type: 'log',
            body: query,
        }).then(function (metrics) {
            response.statusCode = 204;
            return response.json({action: 'deleteAll', result: true});
        }, function (error, body, code) {
            console.trace("error: ", error.message);
            if (error) throw new Error(error);
            response.statusCode = 500;
            return next(error);
        });
    }
};
