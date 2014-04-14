///////////////////////////////////////////////////////////////////////////////
// @file         : throttle.js                                               //
// @summary      : Rate limiting service                                     //
// @version      : 0.1                                                       //
// @project      : Apicat.us                                                 //
// @keywords     : rate, limiting, throttle, mongodb                         //
// @description  : A Node.js module that helps with rate limiting            //
// @author       : Benjamin Maggi                                            //
// @email        : benjaminmaggi@gmail.com                                   //
// @date         : 16 Apr 2014                                               //
// @license:     : MIT                                                       //
// ------------------------------------------------------------------------- //
//                                                                           //
// Copyright 2014 Benjamin Maggi <benjaminmaggi@gmail.com>                   //
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

// Module dependencies
var config = require('../config'),
    mongoose = require('mongoose');

// Load model
var RateBuckets_schema = require('../models/throttle'),
    RateBuckets = mongoose.model('RateBuckets', RateBuckets_schema);

/*
var Throttle = module.exports = function(key, options) {
    this.key = key

    options = options || {}
    this.span = options.span || 15 * 60 * 1000 // 15 mins
    this.accuracy = options.accuracy || 10
    this.interval = this.span / this.accuracy
}
*/
//db.throttle.ensureIndex( { "createdAt": 1 }, { expireAfterSeconds: 3600 } )

exports.throttle = function(request, response, next) {
    'use strict';
    var ip = request.headers['x-forwarded-for'] ||
        request.connection.remoteAddress ||
        request.socket.remoteAddress ||
        request.connection.socket.remoteAddress;

    RateBuckets
        .findOneAndUpdate({ip: ip}, { $inc: { hits: 1 } }, { upsert: false })
        .exec(function(error, rateBucket) {
            if (error) {
                response.statusCode = 500;
                return next(error);
            }
            if(!rateBucket) {
                rateBucket = new RateBuckets({
                    createdAt: new Date(),
                    ip: ip
                });
                rateBucket.save(function(error, rateBucket) {
                    if (error) {
                        response.statusCode = 500;
                        return next(error);
                    }
                    if(!rateBucket) {
                        response.statusCode = 500;
                        return response.json({error: "RateLimit", message: 'Cant\' create rate limit bucket'});
                    }
                    var timeUntilReset = config.rateLimits.ttl - (new Date().getTime() - rateBucket.createdAt.getTime());
                    console.log(JSON.stringify(rateBucket, null, 4));
                    // the rate limit ceiling for that given request
                    response.set('X-Rate-Limit-Limit', config.rateLimits.maxHits);
                    // the number of requests left for the time window
                    response.set('X-Rate-Limit-Remaining', config.rateLimits.maxHits - 1);
                    // the remaining window before the rate limit resets in miliseconds
                    response.set('X-Rate-Limit-Reset', timeUntilReset);
                    // Return bucket so other routes can use it
                    request.rateBucket = rateBucket;
                    return next();
                });
            } else {
                var timeUntilReset = config.rateLimits.ttl - (new Date().getTime() - rateBucket.createdAt.getTime());
                var remaining =  Math.max(0, (config.rateLimits.maxHits - rateBucket.hits));
                console.log(JSON.stringify(rateBucket, null, 4));
                // the rate limit ceiling for that given request
                response.set('X-Rate-Limit-Limit', config.rateLimits.maxHits);
                // the number of requests left for the time window
                response.set('X-Rate-Limit-Remaining', remaining);
                // the remaining window before the rate limit resets in miliseconds
                response.set('X-Rate-Limit-Reset', timeUntilReset);
                // Return bucket so other routes can use it
                request.rateBucket = rateBucket;
                // Reject or allow
                if(rateBucket.hits < config.rateLimits.maxHits) {
                    return next();
                } else {
                    response.statusCode = 429;
                    return response.json({error: "RateLimit", message: 'Too Many Requests'});
                }
            }
        });

};
/*Account.statics.findOrCreate = function(conditions, doc, options, callback) {
    'use strict';

    if (arguments.length < 4) {
        if (typeof options === 'function') {
            // Scenario: findOrCreate(conditions, doc, callback)
            callback = options;
            options = {};
        } else if (typeof doc === 'function') {
            // Scenario: findOrCreate(conditions, callback);
            callback = doc;
            doc = {};
            options = {};
        }
    }
    var self = this;
    this.findOne(conditions, function (err, result) {
        if (err || result) {
            if (options && options.upsert && !err) {
                self.update(conditions, doc, function (err) {
                    if (err) {
                        console.log("error");
                        callback(new Error(err), false);
                    } else {
                        self.findOne(conditions, function (err, result) {
                            callback(err, result, false);
                        });
                    }
                });
            } else {
                callback(err, result, false);
            }
        } else {
            for (var key in doc) {
                conditions[key] = doc[key];
            }
            console.log("conditions:", JSON.stringify(conditions, null, 4));
            var obj = new self(conditions);
            obj.save(function (err) {
                callback(err, obj, true);
            });
        }
    });
};*/

/*
db.throttle.ensureIndex({"createdAt": 1}, {expireAfterSeconds: 60})


db.throttle.insert( {
    "createdAt": new Date(),
    "ip": "192.168.1.1",
    "token": "123456",
    "userid": "benjamin",
    "api": "MyApi",
    "hits": 1
})

db.throttle.findAndModify({
    query: { token: "123456" },
    update: { $inc: { hits: 1 } },
    upsert: true
})


response.set('X-Rate-Limit-Limit', header.value); // the rate limit ceiling for that given request
response.set('X-Rate-Limit-Remaining', header.value); // the number of requests left for the time window
response.set('X-Rate-Limit-Reset', header.value); // the remaining window before the rate limit resets in UTC epoch seconds
*/
// HTTP 429 “Too Many Requests”
