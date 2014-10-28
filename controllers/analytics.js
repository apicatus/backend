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

// TODO:
/*
    1) only allow owned/public apis to be analyzed
    2) Cleanup queries
    3) MapReduce to Aggregations
    4) normalized queries maybe custom query language (sum, min, max, etc...)
*/

// Controllers
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = mongoose.Types.ObjectId
    url = require('url'),
    UAParser = require('ua-parser-js'),
    acceptLanguage = require('../services/accParser'),
    config = require('../config'),
    elasticsearch = require('elasticsearch');

// Load models
var logs_schema = require('../models/logs'),
    Logs = mongoose.model('Logs', logs_schema);
var analytics_schema = require('../models/analytics'),
    Analytics = mongoose.model('Logs', analytics_schema);

var client = new elasticsearch.Client();


var parseQuery = function(request) {
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
        since = new Date(); until = new Date();
        since.setDate(since.getDate() - 1);
    }
    console.log("since: ", since, " until: ", until);
    var params = {
        api: query.api || null,
        since: since,
        until: until,
        limit: 100,
        skip: 10
    };
    //console.log('params: ', JSON.stringify(request.user, null, 4));
    return params;
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
    until = new Date();
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
exports.performance = function (request, response, next) {
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

    console.log("id: ", query);

    parseQuery(request);
    // and here are the grouping request:
    var aggregate = [
        {
            $match: {
                time: {
                    $gt: 0
                },
                date: {
                    $gte: new Date(since),
                    $lt: new Date(until)
                },
                status: {
                    $gte: 100
                },
                digestor: { $in: request.user.digestors }
            }
        },
        {
            $match: {
                digestor: ObjectId.createFromHexString(query.id)
            }
        },
        {
            $project: {
                _id: 0, // let's remove bson id's from request's result
                status: 1,
                success: { $cond: [{$lt: ['$status', 400]}, 1, 0]}, // add 1
                error: { $cond: [{$gte: ['$status', 400]}, 1, 0]},
                cache: { $cond: [{$eq: ['$status', 304]}, 1, 0]},
                //date: {year: {$year: '$date'}, month: {$month: '$date'}, day: {$dayOfMonth: '$date'}}
                //timestamp: {day: {$dayOfMonth: '$date'}},
                timestamp: {year: { $year: '$date' }, day: {$dayOfMonth: '$date'}, month: { $month: '$date' }},
                date: '$date',
                index: { $const:[0,1] }
                //date: { hour: { $hour: '$date' } }
            }
        },
        {
            $group: {
                //_id: {c: '$country', n: '$name' },
                _id: '$timestamp',
                error: { $sum: '$error'},
                success: { $sum: '$success' },
                cache:  { $sum: '$cache' },
                vv: { $push: {$dayOfMonth: '$date'}},
                total: { $sum: 1 },
            }
        },
        {
            $sort: {
                total: 1
            }
        },
        {
            $limit: 100
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
exports.getto = function (request, response, next) {
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

    console.log("since: ", new Date(since), " until: ", new Date(until), " dig: ", request.user.digestors);

    var fx = {
        map: function() {
            print("cosasss");
            emit(this.digestor, {
                time: this.time,
                digestors: digestors
            });
        },
        reduce: function(key, values) {
            return {
                matrix: digestors
            };
        },
        finalize: function(key, value) {
            return value;
        },
        out: { inline: 1 },
        verbose: true,
        scope: {
            digestors: request.user.digestors
        },
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
exports.metrixx = function (request, response, next) {
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
        since = new Date().setDate(new Date().getDate() - 7);
    }
    parseQuery(request);
    console.log("metrixx: since: ", new Date(since), " until: ", new Date(until), " dig: ", request.params.id);
    // and here are the grouping request:
    var aggregate = [{
        $match: {
            time: {
                $gte: 0
            },
            date: {
                $gte: new Date(since),
                $lt: new Date(until)
            },
            status: {
                $gte: 100
            },
            digestor: ObjectId(request.params.id)
        }
    }, {
        $project: {
            _id: 0, // let's remove bson id's from request's result
            status: 1,
            time: 1,
            date: 1, //{ year: { $year: '$date' }, month: { $month: '$date' }, day: {$dayOfMonth: '$date'} },
            method: 1
        }
    }, {
        $group: {
            //_id: {c: '$country', n: '$name' },
            _id: {
                method: '$method',
                date: '$date'
            },
            avg_time: { $avg: '$time' },
            max_time: { $max: '$time' },
            min_time: { $min: '$time' },
            timex: { $sum: '$time' },
            total: { $sum: 1 },
        }
    }, {
        $project: {
            _id: 0,
            method: '$_id.method',
            total: 1,
            dataset: {
                date: '$_id.date',
                time: {
                    avg: '$avg_time',
                    max: '$max_time',
                    min: '$min_time',
                    time: '$timex',
                }
            }
        }
    }, {
        $group: {
            _id: '$method',
            dataset: {
                $push: {
                    timestamp: '$dataset.date',
                    data: '$dataset.time.time'
                }
            },
            total: { $sum: '$total' },
            avg: { $avg: '$dataset.time.avg' },
            min: { $min: '$dataset.time.min' },
            max: { $max: '$dataset.time.max' }
        }
    }];
    // a promise is returned so you may instead write
    var promise = Logs.aggregate(aggregate)
    .exec(function (error, model, stats) {
        if (error) {
            console.log("ERROR!");
            response.statusCode = 500;
            return next();
        }
        if(!model) {
            console.log("not found !");
            response.statusCode = 204;
            return response.json({"title": "error", "message": "Not Found", "status": "fail"});
        }
        response.json(model);
    });
};

exports.summaryStats = function (request, response, next) {
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
        since = new Date().setDate(new Date().getDate() - 7);
    }

    /*since = new Date(2013, 1, 1);
    until = new Date();*/
    parseQuery(request);
    // and here are the grouping request:
    var aggregate = [
        {
            $match: {
                time: {
                    $gt: 0
                },
                date: {
                    $gte: new Date(since),
                    $lt: new Date(until)
                },
                status: {
                    $gte: 100
                },
                digestor: { $in: request.user.digestors }
            }
        },
        {
            $project: {
                _id: 0, // let's remove bson id's from request's result
                status: 1,
                time: 1,
                date: { year: { $year: '$date' }, month: { $month: '$date' }, day: {$dayOfMonth: '$date'} },
                day: { $dayOfMonth: '$date' },
                digestor: 1
            }
        },
        {
            $group: {
                _id: { digestor:'$digestor', date: '$date' },
                avg_time: { $avg: '$time' },
                max_time: { $max: '$time' },
                min_time: { $min: '$time' },
                /*data: {
                    $addToSet: {
                        day: '$day',
                        time: '$time'
                    }
                },*/
                total: { $sum: 1 },
            }
        },
        {
            $project: {
                _id: 0,
                digestor: '$_id.digestor',
                total: 1,
                //data: 1,
                dataset: {
                    date: '$_id.date',
                    time: {
                        avg: '$avg_time',
                        max: '$max_time',
                        min: '$min_time'
                    },
                    total: '$total'
                }
            }
        },
        {
            $group: {
                _id: '$digestor',
                dataset: {
                    $push: '$dataset'
                },
                total: { $sum: '$dataset.total' },
                avg_time: { $avg: '$dataset.time.avg'}
                /*time: {
                    avg: { $avg: '$dataset.time.avg' },
                    max: { $max: '$dataset.time.max' },
                    min: { $min: '$dataset.time.min' }
                }*/
            }
        },
        {
            $sort: {
                dataset: 1
            }
        },
        {
            $limit: 100
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
        console.log("model", model);
        model.forEach(function(data, index){
            data.dataset.forEach(function(set){
                var date = set.date;
                set.date = new Date(date.year, date.month - 1, date.day);
            })
        })
        response.json(model);
    });
};
///////////////////////////////////////////////////////////////////////////////
// Query bytes in out from                                                   //
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
exports.getBytesTransferred = function (request, response, next) {

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
    var xQuery = parseQuery(request);

    console.log("getBytesTransferred: since: ", query);

    var aggregate = [
        {
            $match: {
                time: {
                    $gt: 0
                },
                date: {
                    $gte: new Date(since),
                    $lt: new Date(until)
                },
                status: {
                    $gte: 100
                },
                digestor: ObjectId(request.params.id)
            }
        },
        {
            $project: {
                _id: 0, // let's remove bson id's from request's result
                method: 1,
                success: { $cond: [{$lt: ['$status', 400]}, 1, 0]}, // add 1
                error: { $cond: [{$gte: ['$status', 400]}, 1, 0]},
                cache: { $cond: [{$eq: ['$status', 304]}, 1, 0]},
                bytesOut: {$ifNull: ['$responseHeaders.content-length', 0]},
                timestamp: {year: { $year: '$date' }, day: {$dayOfMonth: '$date'}, month: { $month: '$date' }, hour: { $hour: '$date'}, minute: { $minute: '$date'}},
            }
        },
        {
            $group: {
                _id: { method:'$method', minute: '$timestamp.minute'},
                error: { $sum: '$error'},
                success: { $sum: '$success' },
                cache:  { $sum: '$cache' },
                bytesOut: { $sum: '$bytesOut' },
                total: { $sum: 1 },
            }
        },
        {
            $sort: {
                '_id.date': -1
            }
        },
        {
            $project: {
                _id: 0,
                method: '$_id.method',
                dataset: {
                    ts: '$_id.minute',
                    out: '$bytesOut',
                    //in
                }
            }
        },
        {
            $group: {
                _id: '$method',
                dataset: {
                    $push: { 
                        ts: '$dataset.ts',
                        out: '$dataset.out',
                    }
                }
            }
        },
        {
            $project: {
                _id: 1,
                bytesOut: '$dataset.out'
            }
        },
        {
            $limit: 100
        }
    ];


    var promise = Logs.aggregate(aggregate)
    .exec(function (error, model, stats) {
        if (error) {
            console.log("ERROR!");
            response.statusCode = 500;
            return next();
        }
        if(!model) {
            console.log("not found !");
            response.statusCode = 204;
            return response.json({"title": "error", "message": "Not Found", "status": "fail"});
        }
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
exports.getBytesTransferred2 = function (request, response, next) {

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
    parseQuery(request);
    
    console.log("metrixx: since: ", new Date(since), " until: ", new Date(until), " dig: ", request.params.id);
    
    var aggregate = [
        {
            $match: {
                time: {
                    $gte: 0
                },
                date: {
                    $gte: new Date(since),
                    $lt: new Date(until),
                },
                digestor: ObjectId(request.params.id)
            }
        },
        {
            $project: {
                _id: 0, // let's remove bson id's from request's result
                time: 1,
                bytesIn: {$ifNull: ['$requestHeaders.content-length', 0]}, // and let's turn the nested field into usual field (usual renaming)
                bytesOut: {$ifNull: ['$responseHeaders.content-length', 0]}, // and let's turn the nested field into usual field (usual renaming)
                date: 1,
                method: 1
            }
        },
        {
            $group: {
                //_id: {c: '$country', n: '$name' },
                _id: { method:'$method', date: '$date', out: '$bytesOut', in: '$bytesIn' },
                total: { $sum: 1 }
            }
        },
        {
            $project: {
                _id: 0,
                method: '$_id.method',
                total: 1,
                bytesOut_avg: 1,
                dataset: {
                    date: '$_id.date',
                    out: '$_id.out',
                    in: '$_id.in'
                },
            }
        },
        {
            $group: {
                _id: '$method',
                dataset: {
                    $push: { 
                        timestamp: '$dataset.date', 
                        out: {
                            bytes: '$dataset.out' 
                        },
                        in: {
                            bytes: '$dataset.in' 
                        }
                    }
                },
                sum_out: { $sum: '$dataset.out' },
                avg_out: { $avg: '$dataset.out' },
                max_out: { $max: '$dataset.out' },
                min_out: { $min: '$dataset.out' },
                
                sum_in: { $sum: '$dataset.in' },
                avg_in: { $avg: '$dataset.in' },
                max_in: { $max: '$dataset.in' },
                min_in: { $min: '$dataset.in' }
            }
        },
        {
            $project: {
                _id: 1,
                total: 1,
                bytesOut_avg: 1,
                dataset: 1,
                summary: {
                    out: {
                        total: '$sum_out',
                        avg: '$avg_out',
                        max: '$max_out',
                        min: '$min_out'
                    },
                    in: {
                        total: '$sum_in',
                        avg: '$avg_in',
                        max: '$max_in',
                        min: '$min_in'
                    }
                }
            }
        },
        {
            $sort: {
                total: -1
            }
        },
        {
            $limit: 100
        }
    ];

   // a promise is returned so you may instead write
    var promise = Logs.aggregate(aggregate)
    .exec(function (error, model, stats) {
        if (error) {
            console.log("ERROR!");
            response.statusCode = 500;
            return next();
        }
        if(!model) {
            console.log("not found !");
            response.statusCode = 204;
            return response.json({"title": "error", "message": "Not Found", "status": "fail"});
        }
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
exports.contentLength = function (request, response, next) {
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
    until = new Date();
    //console.log("since: ", new Date(since), " until: ", new Date(until));
    parseQuery(request);

    // and here are the grouping request:
    var fx = {
        map: function() {
            emit(this.digestor, {
                date: this.date,
                bytesIn: parseInt(this.requestHeaders['content-length'], 10) || 0,
                bytesOut: parseInt(this.responseHeaders['content-length'], 10) || 0
            });
        },
        reduce: function(key, values) {
            /*Array.prototype.min = function () {
                return this.reduce(function (p, v) {
                    return ( p < v ? p : v );
                });
            };
            Array.prototype.max = function () {
                return this.reduce(function (p, v) {
                    return ( p > v ? p : v );
                });
            };*/
            var bytesInArr = [];
            var bytesOutArr = [];
            for ( var i = 1; i < values.length; i++ ) {
               bytesInArr.push(values[i].bytesIn);
               bytesOutArr.push(values[i].bytesOut);
            }
            return {
                "dataset": values,
                "in": {
                    "sum": Array.sum(bytesInArr),
                    "avg": Array.avg(bytesInArr),
                    "stdDev": Array.stdDev(bytesInArr),
                    "max": Math.max.apply(Math, bytesInArr),
                    "min": Math.min.apply(Math, bytesInArr)
                },
                "out": {
                    "sum": Array.sum(bytesOutArr),
                    "avg": Array.avg(bytesOutArr),
                    "stdDev": Array.stdDev(bytesOutArr),
                    "max": Math.max.apply(Math, bytesOutArr),
                    "min": Math.min.apply(Math, bytesOutArr)
                }
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
            },
            digestor: ObjectId.createFromHexString('535b97507899a672c49dd490')
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
exports.contentLength2 = function (request, response, next) {
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

    since = new Date(2014, 1, 1);
    until = new Date();
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
                time: 1,
                bytesIn: '$requestHeaders.content-length', // and let's turn the nested field into usual field (usual renaming)
                bytesOut: '$responseHeaders.content-length', // and let's turn the nested field into usual field (usual renaming)
                //date: {year: {$year: '$date'}, month: {$month: '$date'}, day: {$dayOfMonth: '$date'}}
                date: {year: {$year: '$date'}}
            }
        },
        {
            $group: {
                //_id: {c: '$country', n: '$name' },
                _id: '$date',
                bytesIn_sum: { $sum: '$bytesIn'},
                bytesIn_max: { $max: '$bytesIn'},
                bytesIn_min: { $min: '$bytesIn'},
                bytesIn_avg: { $avg: '$bytesIn'},
                bytesOut_sum: { $sum: '$bytesOut'},
                bytesOut_max: { $max: '$bytesOut'},
                bytesOut_min: { $min: '$bytesOut'},
                bytesOut_avg: { $avg: '$bytesOut'},
                total: { $sum: 1 }
            }
        },
        {
            $project: {
                _id: 1,
                in: {
                    sum: '$bytesIn_sum',
                    max: '$bytesIn_max',
                    min: '$bytesIn_min',
                    avg: '$bytesIn_avg'
                },
                out: {
                    sum: '$bytesOut_sum',
                    max: '$bytesOut_max',
                    min: '$bytesOut_min',
                    avg: '$bytesOut_avg'
                },
                total: 1
            }
        },
        {
            $sort: {
                total: -1
            }
        },
        {
            $limit: 100
        }
    ];

    var ln = acceptLanguage.parse('en-US,en;q=0.8,es-419;q=0.6,es;q=0.4');

    console.log(ln);
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

///////////////////////////////////////////////////////////////////////////////
// Geolocation statistics                                                    //
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
exports.metricsNew = function (request, response, next) {
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
        type: 'log',
        size: query.limit || 10,
        from: query.from || 0,
        body: {
            // AGGREGATION

            /*aggs: {
                timex: {
                    date_histogram: {
                        field: "time",
                        interval: "1m"
                    }
                }
            },*/
            // Begin query.
            query: {
                match_all: {}
            },
            aggs: {
                'load_time_outlier': {
                    percentiles: {
                        field: "time"
                    }
                },
                'average': { 
                    avg: { 
                        field: "time" 
                    }
                }
            },
            facets: {
                latency: {
                    date_histogram: {
                        field: 'date',
                        value_field: 'time',
                        interval: '1m'
                    },
                    global: true,
                    facet_filter: {
                        fquery: {
                            query: {
                                filtered: {
                                    query: {
                                        query_string: {
                                            query: '*'
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
                                                            query: "method:(" + request.params.id + ")"
                                                        }
                                                    }
                                                }
                                            }]
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }).then(function (metrics) {
        if(!metrics.facets.latency.entries.length) {
            response.statusCode = 404;
            return response.json({"title": "error", "message": "Not Found", "status": "fail"});
        }
        return response.json({
            percentiles: metrics.aggregations.load_time_outlier.values,
            average: metrics.aggregations.average.value,
            letancy: metrics.facets.latency.entries
        });
    }, function (error, body, code) {
        console.trace("error: ", error.message);
        if (error) throw new Error(error);
        response.statusCode = 500;
        return next(error);
    });
};
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
