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
var config = require('../config'),
    mongoose = require('mongoose'),
    elasticsearch = require('elasticsearch');
    moment = require('moment'),
    url = require('url'),
    acceptLanguage = require('../services/accParser'),
    Schema = mongoose.Schema,
    ObjectId = mongoose.Types.ObjectId;
    
    

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

};

///////////////////////////////////////////////////////////////////////////////
// Route to get Accept-Language statistics                                   //
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
exports.languageStatistics = function (request, response, next) {
    'use strict';

    var defaults = {
        skip : 0,
        limit : 0,
        digestor: '',
        method: ''
    };
    var query = url.parse(request.url, true).query;
    var since, until, tzone;

    // Very crude ISO-8601 date pattern matching
    var isoDate = /^(\d{4})(?:-?W(\d+)(?:-?(\d+)D?)?|(?:-(\d+))?-(\d+))(?:[T ](\d+):(\d+)(?::(\d+)(?:\.(\d+))?)?)?(?:Z(-?\d*))?$/;

    if(query.since && query.until) {
        since = query.since.match(isoDate) ? query.since : parseInt(query.since, 10);
        until = query.until.match(isoDate) ? query.until : parseInt(query.until, 10);
    } else {
        // If empty then select the last 60 minutes
        since = new Date().setDate(new Date().getDate() - 7);
        until = new Date().getTime();
    }

    var search = function(since, until) {
        var search = {
            "query": {
                "filtered" : { 
                    "filter": { 
                        "bool": {
                            "must": [{
                                "range" : { 
                                    date: {
                                        from: since,
                                        to: until
                                    }
                                }
                            }],
                            "should": []
                        }
                    } 
                }
            },
            "aggregations": {
                "summary": {
                    "terms": {
                        "field": "requestHeaders.accept-language"
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
            search.aggregations["digestors"] = {
                "terms": {
                    "field": "digestor"
                },
                "aggregations": {
                    "dataset": {
                        "terms": {
                            "field": "requestHeaders.accept-language"
                        }
                    }
                }
            };
        }

        return search;
    };
    client.search({
        index: 'logs',
        type: 'log',
        body: search(since, until),
    }).then(function (metrics) {
        if(!metrics.aggregations) {
            response.statusCode = 404;
            return response.json({"title": "error", "message": "Not Found", "status": "fail"});
        }
        return response.json(metrics.aggregations);
    }, function (error, body, code) {
        console.trace("error: ", error.message);
        if (error) throw new Error(error);
        response.statusCode = 500;
        return next(error);
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
exports.geoStatistics = function (request, response, next) {
    'use strict';

    var defaults = {
        skip : 0,
        limit : 0,
        digestor: '',
        method: ''
    };
    var query = url.parse(request.url, true).query;
    var since, until, tzone;

    // Very crude ISO-8601 date pattern matching
    var isoDate = /^(\d{4})(?:-?W(\d+)(?:-?(\d+)D?)?|(?:-(\d+))?-(\d+))(?:[T ](\d+):(\d+)(?::(\d+)(?:\.(\d+))?)?)?(?:Z(-?\d*))?$/;

    if(query.since && query.until) {
        since = query.since.match(isoDate) ? query.since : parseInt(query.since, 10);
        until = query.until.match(isoDate) ? query.until : parseInt(query.until, 10);
    } else {
        // If empty then select the last 60 minutes
        since = new Date().setDate(new Date().getDate() - 7);
        until = new Date().getTime();
    }

    var search = function(since, until) {
        var search = {
            "query": {
                "filtered" : { 
                    "filter": { 
                        "bool": {
                            "must": [{
                                "range" : { 
                                    date: {
                                        from: since,
                                        to: until
                                    }
                                }
                            }],
                            "should": []
                        }
                    } 
                }
            },
            "aggregations": {
                /*"digestors": {
                    "terms": {
                        "field": "digestor"
                    },
                    "aggregations": {
                        "dataset": {
                            "terms": {
                                "field": "geo.country"
                            }
                        }
                    }
                },*/
                "summary": {
                    "terms": {
                        "field": "geo.country",
                        "size": 0
                    },
                    "aggregations": {
                        "stats": {
                            "extended_stats": {
                                "field": "time"
                            }
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
            search.aggregations["digestors"] = {
                "terms": {
                    "field": "digestor"
                },
                "aggregations": {
                    "dataset": {
                        "terms": {
                            "field": "geo.country",
                            "size": 0
                        },
                        "aggregations": {
                            "stats": {
                                "extended_stats": {
                                    "field": "time"
                                }
                            }
                        }
                    }
                }
            };
        }

        return search;
    };

    /*var search = {
        "query": {
            "filtered" : { 
                "filter": { 
                    "bool": {
                        "must": [{
                            "range" : { 
                                date: {
                                    from: since,
                                    to: until
                                }
                            }
                        },
                        {
                            "fquery": {
                                "query": {
                                    "query_string": {
                                        "query": request.params.entity + ":" + request.params.id
                                    }
                                },
                                "_cache": true
                            }
                        }]
                    }
                } 
            }
        },
        "facets": {
            "map": {
                "terms": {
                    "field": "geo.country",
                    "size": 100,
                    "exclude": []
                }
            }
        }
    };*/

    client.search({
        index: 'logs',
        type: 'log',
        body: search(since, until),
    }).then(function (metrics) {
        if(!metrics.aggregations) {
            response.statusCode = 404;
            return response.json({"title": "error", "message": "Not Found", "status": "fail"});
        }
        return response.json(metrics);
    }, function (error, body, code) {
        console.trace("error: ", error.message);
        if (error) throw new Error(error);
        response.statusCode = 500;
        return next(error);
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
exports.agentStatistics = function (request, response, next) {
    'use strict';

    var defaults = {
        skip : 0,
        limit : 0,
        digestor: '',
        method: ''
    };
    var query = url.parse(request.url, true).query;
    var since, until, tzone;

    // Very crude ISO-8601 date pattern matching
    var isoDate = /^(\d{4})(?:-?W(\d+)(?:-?(\d+)D?)?|(?:-(\d+))?-(\d+))(?:[T ](\d+):(\d+)(?::(\d+)(?:\.(\d+))?)?)?(?:Z(-?\d*))?$/;

    if(query.since && query.until) {
        since = query.since.match(isoDate) ? query.since : parseInt(query.since, 10);
        until = query.until.match(isoDate) ? query.until : parseInt(query.until, 10);
    } else {
        // If empty then select the last 60 minutes
        since = new Date().setDate(new Date().getDate() - 7);
        until = new Date().getTime();
    }

    var search = function(since, until) {
        var search = {
            "query": {
                "filtered" : { 
                    "filter": { 
                        "bool": {
                            "must": [{
                                "range" : { 
                                    date: {
                                        from: since,
                                        to: until
                                    }
                                }
                            }],
                            "should": []
                        }
                    } 
                }
            },
            "aggregations": {
                "agents": {
                    "terms": {
                        "field": "ua.ua.family"
                    },
                    "aggregations": {
                        "stats": {
                            "extended_stats": {
                                "field": "time"
                            }
                        },
                        "transfers": {
                            "extended_stats": {
                                "field": "responseHeaders.content-length"
                            }
                        }
                    }
                },
                "devices": {
                    "terms": {
                        "field": "ua.device.family"
                    },
                    "aggregations": {
                        "stats": {
                            "extended_stats": {
                                "field": "time"
                            }
                        }
                    }
                },
                "oess": {
                    "terms": {
                        "field": "ua.os.family"
                    },
                    "aggregations": {
                        "stats": {
                            "extended_stats": {
                                "field": "time"
                            }
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
            search.aggregations["digestors"] = {
                "terms": {
                    "field": "digestor"
                },
                "aggregations": {
                    "dataset": {
                        "terms": {
                            "field": "ua.ua.family"
                        },
                        "aggregations": {
                            "stats": {
                                "extended_stats": {
                                    "field": "time"
                                }
                            }
                        }
                    }
                }
            };
        }

        return search;
    };

    client.search({
        index: 'logs',
        type: 'log',
        body: search(since, until),
    }).then(function (metrics) {
        if(!metrics.aggregations) {
            response.statusCode = 404;
            return response.json({"title": "error", "message": "Not Found", "status": "fail"});
        }
        return response.json(metrics.aggregations);
    }, function (error, body, code) {
        console.trace("error: ", error.message);
        if (error) throw new Error(error);
        response.statusCode = 500;
        return next(error);
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
        until = new Date().getTime();
        since = new Date().setMinutes(new Date().getMinutes() - 60);
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

exports.statuses = function (request, response, next) {
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
        since = new Date().setMinutes(new Date().getMinutes() - 60);
    }

    var search = {
        query: {
            match_all: {}
        },
        "facets": {
            "200": {
                "date_histogram": {
                    "field": "date",
                    "interval": "1m",
                },
                "global": true,
                "facet_filter": {
                    "fquery": {
                        "query": {
                            "filtered": {
                                "query": {
                                    "query_string": {
                                        "query": "status:200"
                                    }
                                },
                                "filter": {
                                    "bool": {
                                        "must": [{
                                            "range": {
                                                "date": {
                                                    "from": since,
                                                    "to": until
                                                }
                                            }
                                        }, {
                                            fquery: {
                                                query: {
                                                    query_string: {
                                                        query: "method:" + request.params.id
                                                    }
                                                }
                                            }
                                        }, {
                                            "exists": {
                                                "field": "status"
                                            }
                                        }]
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "400": {
                "date_histogram": {
                    "field": "date",
                    "interval": "1m",
                    "min_doc_count": 0,
                },
                "global": true,
                "facet_filter": {
                    "fquery": {
                        "query": {
                            "filtered": {
                                "query": {
                                    "query_string": {
                                        "query": "status:400"
                                    }
                                },
                                "filter": {
                                    "bool": {
                                        "must": [{
                                            "range": {
                                                "date": {
                                                    "from": since,
                                                    "to": until
                                                }
                                            }
                                        }, {
                                            fquery: {
                                                query: {
                                                    query_string: {
                                                        query: "method:" + request.params.id
                                                    }
                                                }
                                            }
                                        }, {
                                            "exists": {
                                                "field": "status"
                                            }
                                        }]
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "500": {
                "date_histogram": {
                    "field": "date",
                    "interval": "1m",
                },
                "global": true,
                "facet_filter": {
                    "fquery": {
                        "query": {
                            "filtered": {
                                "query": {
                                    "query_string": {
                                        "query": "status:500"
                                    }
                                },
                                "filter": {
                                    "bool": {
                                        "must": [{
                                            "range": {
                                                "date": {
                                                    "from": since,
                                                    "to": until
                                                }
                                            }
                                        }, {
                                            fquery: {
                                                query: {
                                                    query_string: {
                                                        query: "method:" + request.params.id
                                                    }
                                                }
                                            }
                                        }, {
                                            "exists": {
                                                "field": "status"
                                            }
                                        }]
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
    };
    client.search({
        index: 'logs',
        type: 'log',
        size: query.limit || 10,
        from: query.from || 0,
        body: search,
    }).then(function (metrics) {
        if(!metrics.facets) {
            response.statusCode = 404;
            return response.json({"title": "error", "message": "Not Found", "status": "fail"});
        }
        return response.json({
            statuses: {
                500: metrics.facets["500"].entries,
                400: metrics.facets["400"].entries,
                200: metrics.facets["200"].entries
            }
        });
    }, function (error, body, code) {
        console.trace("error: ", error.message);
        if (error) throw new Error(error);
        response.statusCode = 500;
        return next(error);
    });
};

exports.statusTerms = function (request, response, next) {
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
        since = new Date().setMinutes(new Date().getMinutes() - 60);
    }

    var search = {
        query: {
            match_all: {}
        },
        "facets": {
            "terms": {
                "terms": {
                    "field": "status",
                    "size": 10,
                    "order": "term",
                    "exclude": []
                },
                "facet_filter": {
                    "fquery": {
                        "query": {
                            "filtered": {
                                "query": {
                                    "bool": {
                                        "should": [{
                                            "query_string": {
                                                "query": "status=200"
                                            }
                                        }, {
                                            "query_string": {
                                                "query": "status=400"
                                            }
                                        }, {
                                            "query_string": {
                                                "query": "status=500"
                                            }
                                        }]
                                    }
                                },
                                "filter": {
                                    "bool": {
                                        "must": [{
                                            "range": {
                                                "date": {
                                                    "from": since,
                                                    "to": until
                                                }
                                            }
                                        }, {
                                            fquery: {
                                                query: {
                                                    query_string: {
                                                        query: request.params.entity + ":" + request.params.id
                                                    }
                                                }
                                            }
                                        }, {
                                            "exists": {
                                                "field": "status"
                                            }
                                        }]
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
    };

    client.search({
        index: 'logs',
        type: 'log',
        size: query.limit || 10,
        from: query.from || 0,
        body: search,
    }).then(function (metrics) {
        if(!metrics.facets) {
            response.statusCode = 404;
            return response.json({"title": "error", "message": "Not Found", "status": "fail"});
        }
        return response.json(metrics.facets.terms.terms);
    }, function (error, body, code) {
        console.trace("error: ", error.message);
        if (error) throw new Error(error);
        response.statusCode = 500;
        return next(error);
    });
};

exports.timeStatistics = function (request, response, next) {
    'use strict';

    var defaults = {
        skip : 0,
        limit : 0,
        digestor: '',
        method: ''
    };
    var query = url.parse(request.url, true).query;
    var since, until, tzone;

    // Very crude ISO-8601 date pattern matching
    var isoDate = /^(\d{4})(?:-?W(\d+)(?:-?(\d+)D?)?|(?:-(\d+))?-(\d+))(?:[T ](\d+):(\d+)(?::(\d+)(?:\.(\d+))?)?)?(?:Z(-?\d*))?$/;

    if(query.since && query.until) {
        since = query.since.match(isoDate) ? query.since : parseInt(query.since, 10);
        until = query.until.match(isoDate) ? query.until : parseInt(query.until, 10);
    } else {
        // If empty then select the last 60 minutes
        since = new Date().setMinutes(new Date().getMinutes() - 60);
        until = new Date().getTime();
    }

    var search = {
        "query": {
            "filtered" : { 
                "filter": { 
                    "bool": {
                        "must": [{
                            "range" : { 
                                date: {
                                    from: since,
                                    to: until
                                }
                            }
                        },
                        {
                            "fquery": {
                                "query": {
                                    "query_string": {
                                        "query": request.params.entity + ":" + request.params.id
                                    }
                                },
                                "_cache": true
                            }
                        }]
                    }
                } 
            }
        },
        "aggregations": {
            "statistics": {
                "date_histogram": {
                    "field": "date",
                    "interval": "1m",
                    "min_doc_count": 0,
                    "extended_bounds": {
                        "min": since,
                        "max": until
                    }
                },
                "aggregations": {
                    "time_percentiles": {
                        "percentiles": {
                            field: "time"
                        }
                    },
                    "time_stats": {
                        "stats": {
                            field: "time"
                        }
                    }
                }
            },
            "sum_statistics": {
                "extended_stats": {
                    "field": "time"
                }
            }
        }
    };

    client.search({
        index: 'logs',
        type: 'log',
        size: query.limit || 10,
        from: query.from || 0,
        body: search,
    }).then(function (metrics) {
        if(!metrics.aggregations) {
            response.statusCode = 404;
            return response.json({"title": "error", "message": "Not Found", "status": "fail"});
        }
        return response.json({
            buckets: metrics.aggregations.statistics.buckets,
            sum: metrics.aggregations.sum_statistics
        });
    }, function (error, body, code) {
        console.trace("error: ", error.message);
        if (error) throw new Error(error);
        response.statusCode = 500;
        return next(error);
    });
};

exports.transferStatistics = function (request, response, next) {
    'use strict';

    var defaults = {
        skip : 0,
        limit : 0,
        digestor: '',
        method: ''
    };
    var query = url.parse(request.url, true).query;
    var since, until, tzone;

    // Very crude ISO-8601 date pattern matching
    var isoDate = /^(\d{4})(?:-?W(\d+)(?:-?(\d+)D?)?|(?:-(\d+))?-(\d+))(?:[T ](\d+):(\d+)(?::(\d+)(?:\.(\d+))?)?)?(?:Z(-?\d*))?$/;

    if(query.since && query.until) {
        since = query.since.match(isoDate) ? query.since : parseInt(query.since, 10);
        until = query.until.match(isoDate) ? query.until : parseInt(query.until, 10);
    } else {
        // If empty then select the last 60 minutes
        since = new Date().setMinutes(new Date().getMinutes() - 60);
        until = new Date().getTime();
    }

    var search = {
        "query": {
            "filtered" : { 
                "filter": { 
                    "bool": {
                        "must": [{
                            "range" : { 
                                date: {
                                    from: since,
                                    to: until
                                }
                            }
                        },
                        {
                            "fquery": {
                                "query": {
                                    "query_string": {
                                        "query": request.params.entity + ":" + request.params.id
                                    }
                                },
                                "_cache": true
                            }
                        }]
                    }
                } 
            }
        },
        "aggregations": {
            "statistics": {
                "date_histogram": {
                    "field": "date",
                    "interval": "1m",
                    "min_doc_count": 0,
                    "extended_bounds": {
                        "min": since,
                        "max": until
                    }
                },
                "aggregations": {
                    "transfer_percentiles": {
                        "percentiles": {
                            field: "responseHeaders.content-length"
                        }
                    },
                    "transfer_stats": {
                        "stats": {
                            field: "responseHeaders.content-length"
                        }
                    }
                }
            },
            "sum_statistics": {
                "extended_stats": {
                    "field": "responseHeaders.content-length"
                }
            }
        }
    };

    client.search({
        index: 'logs',
        type: 'log',
        size: query.limit || 10,
        from: query.from || 0,
        body: search,
    }).then(function (metrics) {
        if(!metrics.aggregations) {
            response.statusCode = 404;
            return response.json({"title": "error", "message": "Not Found", "status": "fail"});
        }
        return response.json({
            buckets: metrics.aggregations.statistics.buckets,
            sum: metrics.aggregations.sum_statistics
        });
    }, function (error, body, code) {
        console.trace("error: ", error.message);
        if (error) throw new Error(error);
        response.statusCode = 500;
        return next(error);
    });
};

exports.countryStatistics = function (request, response, next) {
    'use strict';

    var defaults = {
        skip : 0,
        limit : 0,
        digestor: '',
        method: ''
    };
    var query = url.parse(request.url, true).query;
    var since, until, tzone;

    // Very crude ISO-8601 date pattern matching
    var isoDate = /^(\d{4})(?:-?W(\d+)(?:-?(\d+)D?)?|(?:-(\d+))?-(\d+))(?:[T ](\d+):(\d+)(?::(\d+)(?:\.(\d+))?)?)?(?:Z(-?\d*))?$/;

    if(query.since && query.until) {
        since = query.since.match(isoDate) ? query.since : parseInt(query.since, 10);
        until = query.until.match(isoDate) ? query.until : parseInt(query.until, 10);
    } else {
        // If empty then select the last 60 minutes
        since = new Date().setMinutes(new Date().getMinutes() - 60);
        until = new Date().getTime();
    }

    var search = {
        "query": {
            "filtered" : { 
                "filter": { 
                    "bool": {
                        "must": [{
                            "range" : { 
                                date: {
                                    from: since,
                                    to: until
                                }
                            }
                        },
                        {
                            "fquery": {
                                "query": {
                                    "query_string": {
                                        "query": request.params.entity + ":" + request.params.id
                                    }
                                },
                                "_cache": true
                            }
                        }]
                    }
                } 
            }
        },
        "facets": {
            "map": {
                "terms": {
                    "field": "geo.country",
                    "size": 100,
                    "exclude": []
                }
            }
        }
    };

    client.search({
        index: 'logs',
        type: 'log',
        size: query.limit || 10,
        from: query.from || 0,
        body: search,
    }).then(function (metrics) {
        if(!metrics.facets) {
            response.statusCode = 404;
            return response.json({"title": "error", "message": "Not Found", "status": "fail"});
        }
        return response.json(metrics.facets.map.terms);
    }, function (error, body, code) {
        console.trace("error: ", error.message);
        if (error) throw new Error(error);
        response.statusCode = 500;
        return next(error);
    });
};

exports.summary = function (request, response, next) {
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
        since = new Date().setDate(new Date().getDate() - 7);
        until = new Date().getTime();
    }
    query.interval = query.interval || '1d'

    var digestorsQuery = request.user.digestors.map(function(digestor, index) {
        return {
            fquery: {
                query: {
                    query_string: {
                        query: "digestor:" + digestor
                    }
                },
                _cache: true
            }
        };
    });
    digestorsQuery.push({
        range : { 
            date: {
                from: since,
                to: until
            }
        }
    });

    var facets = new Object();
    request.user.digestors.forEach(function(digestor, index) {
        facets[digestor] = {
            date_histogram: {
                key_field: 'date',
                value_field: 'time',
                interval: '1d'
            },
            global: true,
            facet_filter: {
                fquery: {
                    query: {
                        filtered: {
                            filter: {
                                bool: {
                                    must: [{
                                        range: {
                                            date: {
                                                from: since,
                                                to: until
                                            }
                                        }
                                    }, {
                                        fquery: {
                                            query: {
                                                query_string: {
                                                    query: 'digestor:' + digestor
                                                }
                                            }
                                        }
                                    }, {
                                        exists: {
                                            field: 'status'
                                        }
                                    }]
                                }
                            }
                        }
                    }
                }
            }
        };
    });

    var search = function(since, until, interval) {
        return {
            "query": {
                "filtered" : { 
                    "filter": { 
                        "bool": {
                            "must": [{
                                "range" : { 
                                    date: {
                                        from: since,
                                        to: until
                                    }
                                }
                            }, {
                                exists: {
                                    field: 'status'
                                }
                            }, {
                                exists: {
                                    field: 'digestor'
                                }
                            }]
                        }
                    } 
                }
            },
            "aggregations": {
                "digestors": {
                    "terms": {
                        "field": "digestor"
                    },
                    "aggregations": {
                        "dataset": {
                            "date_histogram": {
                                "field": "date",
                                "interval": interval,
                                "min_doc_count": 0,
                                "extended_bounds": {
                                    "min": since,
                                    "max": until
                                }
                            },
                            "aggregations": {
                                "time_stats": {
                                    "stats": {
                                        field: "time"
                                    }
                                }
                            }
                        },
                        "percentiles": {
                            "percentiles": {
                                field: "time"
                            }
                        },
                        "stats": {
                            "stats": {
                                field: "time"
                            }
                        }
                    }
                }
            }
        };
    };



    //return response.json(search);
    /*
        index: 'logs',
        type: 'log',
        size: query.limit || 10,
        from: query.from || 0,

    */
    client.msearch({
        body: [
            { index: 'logs', type: 'log' },
            search(since, until, query.interval),
            { index: 'logs', type: 'log' },
            search(since - (until - since), since, query.interval)
        ]
    }).then(function (metrics) {
        
        if(metrics.responses.length > 2) {
            response.statusCode = 404;
            return response.json({"title": "error", "message": "Not Found", "status": "fail"});
        }
        return response.json({
            current: metrics.responses[0].aggregations.digestors.buckets,
            previous: metrics.responses[1].aggregations.digestors.buckets
        });
        //return response.json(metrics.aggregations.digestors.buckets);
    }, function (error, body, code) {
        console.trace("error: ", error.message);
        if (error) throw new Error(error);
        response.statusCode = 500;
        return next(error);
    });
};

/*
var search = {
        "query": {
            "filtered" : { 
                "filter": { 
                    "bool": {
                        "must": [{
                            "range" : { 
                                date: {
                                    from: since,
                                    to: until
                                }
                            }
                        }, {
                            exists: {
                                field: 'status'
                            }
                        }]
                    }
                } 
            }
        },
        "aggregations": {
            filtered: {
                filter: {
                    bool: {
                        must: [{
                            fquery: {
                                query: {
                                    query_string: {
                                        query: 'digestor:' + "535b97507899a672c49dd490"
                                    }
                                }
                            }
                        }]
                    }
                },
                //"filter" : { "range" : { "status" : { "gte" : 400 } } },
            },
            "digestors": {
                "terms": {
                    "field": "digestor"
                },
                "aggregations": {
                    filtered: {
                        "filter" : { 
                            "bool": {
                                "must": [{
                                    "range" : { 
                                        //"status" : { "gt" : 400 } 
                                        date: {
                                            from: new Date().setHours(new Date().getHours() - 4),
                                            to: new Date().setHours(new Date().getHours() - 2)
                                        }
                                    }
                                }]
                            }
                        },
                    },
                    "transfer_stats": {
                        "date_histogram": {
                            "field": "date",
                            "interval": "1h",
                            "min_doc_count": 0,
                            "extended_bounds": {
                                "min": since,
                                "max": until
                            }
                        },
                        "aggregations": {
                            "transfer_stats": {
                                "stats": {
                                    field: "time"
                                }
                            }
                        }
                    },
                    "transfer_percentiles": {
                        "percentiles": {
                            field: "time"
                        }
                    },
                    "sum_stats": {
                        "stats": {
                            field: "time"
                        }
                    }
                }
            },
            "digestors_prev": {
                "terms": {
                    "field": "digestor",
                },
                "aggregations": {
                    filtered: {
                        "filter" : { 
                            "bool": {
                                "must": [{
                                    "range" : { 
                                        //"status" : { "gt" : 400 } 
                                        date: {
                                            from: new Date().setHours(new Date().getHours() - 48),
                                            to: new Date().setHours(new Date().getHours() - 24)
                                        }
                                    }
                                }]
                            }
                        },
                    },
                    "transfer_stats": {
                        "date_histogram": {
                            "field": "date",
                            "interval": "1h",
                            "min_doc_count": 0,
                            "extended_bounds": {
                                "min": new Date().setHours(new Date().getHours() - 48),
                                "max": new Date().setHours(new Date().getHours() - 24)
                            }
                        },
                        "aggregations": {
                            "transfer_stats": {
                                "stats": {
                                    field: "time"
                                }
                            }
                        }
                    },
                    "transfer_percentiles": {
                        "percentiles": {
                            field: "time"
                        }
                    },
                    "sum_stats": {
                        "stats": {
                            field: "time"
                        }
                    }
                }
            }
        }
    };
    */
/*
AGGREGATE MISSING BUCKETS
var search = {
        "query": {
            "filtered" : { 
                "filter": { 
                    "bool": {
                        "must": [{
                            "range" : { 
                                date: {
                                    from: since,
                                    to: until
                                }
                            }
                        },
                        {
                            "fquery": {
                                "query": {
                                    "query_string": {
                                        "query": "status:500"
                                    }
                                },
                                "_cache": true
                            }
                        },{
                            fquery: {
                                query: {
                                    query_string: {
                                        query: "method:" + request.params.id
                                    }
                                }
                            }
                        }]
                    }
                } 
            }
        },
        "aggregations": {
            "dates_with_holes": {
                "date_histogram": {
                    "field": "date",
                    "interval": "1m",
                    "min_doc_count": 0,
                    "extended_bounds": {
                        "min": since,
                        "max": until
                    }
                },
                "aggregations": {
                    "time_stats": {
                        "stats": {
                            field: "status"
                        }
                    }
                }
            }
        }
    };
*/    
