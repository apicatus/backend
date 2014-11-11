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
    1) Crashes
    2) Search Logs
    4) Crash Summary: by version, by platforms
    5) Total app errors
    6) Crashes by device and by Os
    7) Transactions Per Second
*/

// Controllers
var config = require('../config'),
    mongoose = require('mongoose'),
    elasticsearch = require('elasticsearch');
    url = require('url'),
    extend = require('util')._extend,
    acceptLanguage = require('../services/accParser');

var client = new elasticsearch.Client();

var intervalToString = function(milliseconds) {
    var temp = Math.floor(milliseconds / 1000);

    var years = Math.floor(temp / 31536000);
    if (years) {
        return years + 'y';
    }
    var weeks = Math.floor((temp %= 31536000) / 604800);
    if (weeks) {
        return weeks + 'w';
    }
    var days = Math.floor((temp %= 31536000) / 86400);
    if (days) {
        return days + 'd';
    }
    var hours = Math.floor((temp %= 86400) / 3600);
    if (hours) {
        return hours + 'h';
    }
    var minutes = Math.floor((temp %= 3600) / 60);
    if (minutes) {
        return minutes + 'm';
    }
    var seconds = temp % 60;
    if (seconds) {
        return seconds + 's';
    }
    return '1h';
};

var parseQuery = function(request) {
    'use strict';

    // Very crude ISO-8601 date pattern matching
    var isoDate = /^(\d{4})(?:-?W(\d+)(?:-?(\d+)D?)?|(?:-(\d+))?-(\d+))(?:[T ](\d+):(\d+)(?::(\d+)(?:\.(\d+))?)?)?(?:Z(-?\d*))?$/;
    var params = url.parse(request.url, true).query;

    if(params.since && params.until) {
        params.since = params.since.match(isoDate) ? params.since : parseInt(params.since, 10);
        params.until = params.until.match(isoDate) ? params.until : parseInt(params.until, 10);
    } else {
        // If empty then select the last 7days
        params.since = new Date().setDate(new Date().getDate() - 7);
        params.until = new Date().getTime();
    }

    var query = {
        size: parseInt(params.size, 10) || 100,
        skip: parseInt(params.skip, 10) || 100,
        limit: parseInt(params.limit, 10) || 100,
        since: params.since,
        until: params.until,
        interval: intervalToString(parseInt(params.interval, 10))
    };
    
    return query;
}


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

    var query = parseQuery(request);

    var search = function(since, until) {
        var search = {
            "query": {
                "filtered" : { 
                    "filter": { 
                        "bool": {
                            "must": [{
                                "range" : { 
                                    date: {
                                        from: query.since,
                                        to: query.until
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
                        "field": "requestHeaders.accept-language",
                        "size": query.size
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
    client.search({
        index: 'logs',
        type: 'log',
        body: search(query.since, query.until)
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

    var query = parseQuery(request);

    var search = function(since, until) {
        var search = {
            "query": {
                "filtered" : { 
                    "filter": { 
                        "bool": {
                            "must": [{
                                "range" : { 
                                    date: {
                                        from: query.since,
                                        to: query.until
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
                        "field": "geo.country",
                        "size": query.size
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
        }

        return search;
    };


    client.search({
        index: 'logs',
        type: 'log',
        body: search(query.since, query.until)
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
exports.agentStatistics = function (request, response, next) {
    'use strict';

    var query = parseQuery(request);

    var search = function(since, until) {
        var search = {
            "query": {
                "filtered" : { 
                    "filter": { 
                        "bool": {
                            "must": [{
                                "range" : { 
                                    date: {
                                        from: query.since,
                                        to: query.until
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
                        "field": "ua.ua.family",
                        "size": query.size
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
                "deviceFamilies": {
                    "terms": {
                        "field": "ua.device.family",
                        "size": query.size
                    },
                    "aggregations": {
                        "stats": {
                            "extended_stats": {
                                "field": "time"
                            }
                        }
                    }
                },
                "deviceTypes": {
                    "terms": {
                        "field": "ua.device.type",
                        "size": query.size
                    },
                    "aggregations": {
                        "geo": {
                            "terms": {
                                "field": "geo.country",
                                "size": query.size
                            }
                        }
                    }
                },
                "strings": {
                    "terms": {
                        "field": "ua.string",
                        "size": query.size
                    }
                },
                "oess": {
                    "terms": {
                        "field": "ua.os.family",
                        "size": query.size
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
        }

        return search;
    };

    client.search({
        index: 'logs',
        type: 'log',
        body: search(query.since, query.until),
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
exports.transfer2Statistics = function (request, response, next) {
    'use strict';

    var query = parseQuery(request);

    var search = function(since, until) {
        var search = {
            "query": {
                "filtered" : { 
                    "filter": { 
                        "bool": {
                            "must": [{
                                "range" : { 
                                    date: {
                                        from: query.since,
                                        to: query.until
                                    }
                                }
                            }, {
                                "exists": {
                                    "field": 'time'
                                }
                            }, {
                                "exists": {
                                    "field": 'status'
                                }
                            }],
                            "should": []
                        }
                    } 
                }
            },
            "aggregations": {
                "history": {
                    "date_histogram": {
                        "field": "date",
                        "interval": query.interval,
                        "min_doc_count": 0,
                        "extended_bounds": {
                            "min": query.since,
                            "max": query.until
                        }
                    },
                    "aggregations": {
                        "transfer_percentiles": {
                            "percentiles": {
                                field: "responseHeaders.content-length"
                            }
                        },
                        "transfer_statistics": {
                            "extended_stats": {
                                field: "responseHeaders.content-length"
                            }
                        },
                        "time_statistics": {
                            "extended_stats": {
                                field: "time"
                            }
                        },
                        "geo": {
                            "terms": {
                                "field": "geo.country",
                                "size": query.size
                            }
                        },
                        "statuses": {
                            "terms": {
                                "field": "status",
                                "size": query.size
                            }
                        }
                    }
                },
                "z_statistics": {
                    "extended_stats": {
                        "field": "responseHeaders.content-length"
                    }
                },
                "t_statistics": {
                    "extended_stats": {
                        "field": "time"
                    }
                },
                "statuses": {
                    "terms": {
                        "field": "status",
                        "size": query.size
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

    client.search({
        index: 'logs',
        type: 'log',
        body: search(query.since, query.until),
    }).then(function (metrics) {
        if(!metrics) {
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
exports.geo2stats = function (request, response, next) {
    'use strict';

    var query = parseQuery(request);

    var search = function(since, until) {
        var search = {
            "query": {
                "filtered" : { 
                    "filter": { 
                        "bool": {
                            "must": [{
                                "range" : { 
                                    date: {
                                        from: query.since,
                                        to: query.until
                                    }
                                }
                            }, {
                                "exists": {
                                    "field": 'time'
                                }
                            }, {
                                "exists": {
                                    "field": 'status'
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
                        "field": "geo.country",
                        "size": query.size
                    },
                    "aggregations": {
                        "time": {
                            "extended_stats": {
                                "field": "time"
                            }
                        },
                        "data": {
                            "extended_stats": {
                                "field": "responseHeaders.content-length"
                            }
                        },
                        "status": {
                            "terms": {
                                "field": "status"
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
        }

        return search;
    };

    client.search({
        index: 'logs',
        type: 'log',
        body: search(query.since, query.until),
    }).then(function (metrics) {
        if(!metrics) {
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
// Get Method stats by date                                                  //
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
exports.methodStatsByDate = function (request, response, next) {
    'use strict';

    var query = parseQuery(request);

    var search = function(since, until) {
        var search = {
            "query": {
                "filtered" : { 
                    "filter": { 
                        "bool": {
                            "must": [{
                                "range" : { 
                                    date: {
                                        from: query.since,
                                        to: query.until
                                    }
                                }
                            }, {
                                "exists": {
                                    "field": 'time'
                                }
                            }, {
                                "exists": {
                                    "field": 'status'
                                }
                            }],
                            "should": []
                        }
                    } 
                }
            },
            "aggregations": {
                "methods": {
                    "terms": {
                        "field": "method",
                        "size": query.size
                    },
                    "aggregations": {
                        "time": {
                            "extended_stats": {
                                "field": "time"
                            }
                        },
                        "data": {
                            "extended_stats": {
                                "field": "responseHeaders.content-length"
                            }
                        },
                        "status": {
                            "terms": {
                                "field": "status",
                                "size": query.size
                            }
                        },
                        "geo": {
                            "terms": {
                                "field": "geo.country",
                                "size": query.size
                            }
                        },
                        "os": {
                            "terms": {
                                "field": "ua.os.family",
                                "size": query.size
                            }
                        },
                        "browser": {
                            "terms": {
                                "field": "ua.ua.family",
                                "size": query.size
                            }
                        },
                        "device": {
                            "terms": {
                                "field": "ua.device.type",
                                "size": query.size
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
        }

        return search;
    };

    client.search({
        index: 'logs',
        type: 'log',
        body: search(query.since, query.until),
    }).then(function (metrics) {
        if(!metrics) {
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

