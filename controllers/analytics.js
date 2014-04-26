///////////////////////////////////////////////////////////////////////////////
// @file         : analytics.js                                              //
// @summary      : Analytics controller                                      //
// @version      : 0.1                                                       //
// @project      : apicat.us                                                 //
// @description  : API analysis module                                       //
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
    Schema = mongoose.Schema,
    ObjectId = mongoose.Types.ObjectId
    url = require('url'),
    UAParser = require('ua-parser-js'),
    acceptLanguage = require('../services/accParser');

// Load models
var logs_schema = require('../models/logs'),
    Logs = mongoose.model('Logs', logs_schema);
var analytics_schema = require('../models/analytics'),
    Analytics = mongoose.model('Logs', analytics_schema);


var parseQuery = function(query) {
    'use strict';

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
        since = new Date().setDate(until.getDate() - 7);
    }
    return {
        since: since,
        until: until,
        limit: 10,
        skip: 10
    };
}
exports.languages = function (request, response, next) {
    'use strict';

    var token = request.headers.token;
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
        since = new Date().setDate(new Date().getDate() - 7);
    }

    since = new Date(2014, 3, 16);
    until = new Date(2014, 3, 22);
    console.log("since: ", new Date(since), " until: ", new Date(until));

    // and here are the grouping request:
    var aggregate = [
        {
            $match: {
                time: {
                    $gt: 0
                },
                date: {
                    $gte: new Date(since),
                    $lt: new Date(until),
                }
            }
        },
        {
            $project: {
                _id: 0, // let's remove bson id's from request's result
                language: '$requestHeaders.accept-language' // and let's turn the nested field into usual field (usual renaming)
            }
        },
        {
            $group: {
                //_id: {c: '$country', n: '$name' },
                _id: '$language', // grouping key - group by field district
                total: { $sum: 1 }
            }
        },
        {
            $sort: {
                total: -1
            }
        },
        {
            $limit: 10
        }
    ];

    var ln = acceptLanguage.parse('en-US,en;q=0.8,es-419;q=0.6,es;q=0.4');

    console.log(ln);
    // a promise is returned so you may instead write
    var promise = Logs.aggregate(aggregate)
    //.sort({'total': 'desc'})
    .exec(function (error, model, stats) {
        if (error) {
            response.statusCode = 500;
            return next();
        }
        if(!model) {
            response.statusCode = 404;
            return response.json({"title": "error", "message": "Not Found", "status": "fail"});
        }
        /*model = model.map(function(d, i){
            return [{
                _id: acceptLanguage.parse(d._id),
                total: d.total
            }];
        });*/
        response.json(model);
    });

};
///////////////////////////////////////////////////////////////////////////////
// Route to get platform statistics                                          //
//                                                                           //
// @param {Object} request                                                   //
// @param {Object} response                                                  //
// @param {Object} next                                                      //
// @return {Object} JSON Collection of Platform statistics                   //
//                                                                           //
// @api public                                                               //
//                                                                           //
// @url GET /platform                                                        //
///////////////////////////////////////////////////////////////////////////////
exports.platform = function (request, response, next) {
    'use strict';

    var parser = new UAParser();
    var token = request.headers.token;
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
        since = new Date().setDate(until.getDate() - 7);
    }

    console.log("since: ", new Date(since), " until: ", new Date(until));

    var rules = [{'geo.country_name': '1'}, {time: {$gte: 0}}];
    // and here are the grouping request:
    var aggregate = [
        {
            $match: {
                time: {
                    $gt: 0
                },
                date: {
                    $gte: new Date(since),
                    $lt: new Date(until),
                }
            }
        },
        {
            $project: {
                _id: 0, // let's remove bson id's from request's result
                ua: '$requestHeaders.user-agent', // and let's turn the nested field into usual field (usual renaming)
            }
        },
        {
            $group: {
                _id: '$ua', // grouping key - group by field district
                total: { $sum: 1 }
            }
        },
        {
            $sort: {
                total: -1
            }
        },
        {
            $limit: 10
        }
    ];

    // a promise is returned so you may instead write
    var promise = Logs.aggregate(aggregate)
    .exec(function (error, model, stats) {
        if (error) {
            response.statusCode = 500;
            return next();
        }
        if(!model) {
            response.statusCode = 404;
            return response.json({"title": "error", "message": "Not Found", "status": "fail"});
        }
        var platforms = model.map(function(data, index) {
            var ua = request.headers['user-agent'];
            return {
                ua: parser.setUA(data._id).getResult(),
                total: data.total
            };
        });
        response.json(platforms);
    });

};
exports.geo = function (request, response, next) {
    'use strict';

    var token = request.headers.token;
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
        since = new Date().setDate(until.getDate() - 7);
    }

    //since = new Date(2014, 3, 16);
    //until = new Date(2014, 3, 18);
    console.log("since: ", new Date(since), " until: ", new Date(until));

    var rules = [{'geo.country_name': '1'}, {time: {$gte: 0}}];
    // and here are the grouping request:
    var aggregate = [
        {
            $match: {
                time: {
                    $gt: 0
                },
                date: {
                    $gte: new Date(since),
                    $lt: new Date(until),
                },
                //digestor: ObjectId.createFromHexString('534ad53cc7467c0000655116')
                //ip: '222.18.149.180'
            }
        },
        {
            $project: {
                _id: 0, // let's remove bson id's from request's result
                time: 1, // we need this field
                country: '$geo.country_code', // and let's turn the nested field into usual field (usual renaming)
                name: '$geo.country_name',
            }
        },
        {
            $group: {
                //_id: {c: '$country', n: '$name' },
                _id: '$country', // grouping key - group by field district
                minTime: { $min: '$time'}, // we need some stats for each group (for each district)
                maxTime: { $max: '$time'},
                avgTime: { $avg: '$time'},
                total: { $sum: 1 }
            }
        },
        {
            $sort: {
                total: -1
            }
        },
        {
            $limit: 10
        }
    ];

    // a promise is returned so you may instead write
    var promise = Logs.aggregate(aggregate)
    .exec(function (error, model, stats) {
        if (error) {
            response.statusCode = 500;
            return next();
        }
        if(!model) {
            response.statusCode = 404;
            return response.json({"title": "error", "message": "Not Found", "status": "fail"});
        }
        response.json(model);
    });

};
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


exports.metrics = function (request, response, next) {
    'use strict';

    var token = request.headers.token;
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
        since = new Date().setDate(new Date().getDate() - 7);
    }

    since = new Date(2014, 3, 16);
    until = new Date(2014, 3, 22);
    console.log("since: ", new Date(since), " until: ", new Date(until));

    var fx = {
        map: function() {
            emit(this.digestor, this.time);
        },
        reduce: function(key, values) {
            var res = {
                min: values[0],
                max: values[0]
            }
            for ( var i = 1; i < values.length; i++ ) {
                if ( values[i] < res.min )
                   res.min = values[i];
                if ( values[i] > res.max )
                   res.max = values[i];
            }
            return {
                "sum": Array.sum(values),
                "avg": Array.avg(values),
                "stdDev": Array.stdDev(values),
                "max": res.max,
                "min": res.min
            };
        },
        finalize: function(key, value) {
            return value;
        },
        out: { inline: 1 },
        verbose: true,
        query: {
            date: {
                '$gte': new Date(since),
                '$lt': new Date(until),
            }
        }
    };
    // a promise is returned so you may instead write
    var promise = Logs.mapReduce(fx, function (error, model, stats) {
        if (error) {
            response.statusCode = 500;
            return next();
        }
        if(!model) {
            response.statusCode = 404;
            return response.json({"title": "error", "message": "Not Found", "status": "fail"});
        }
        console.log('map reduce took %d ms', stats.processtime);
        response.json(model);
    });
};
