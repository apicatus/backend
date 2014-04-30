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
                var timeUntilReset = (config.rateLimits.ttl * 1000) - (new Date().getTime() - rateBucket.createdAt.getTime());
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
            var timeUntilReset = (config.rateLimits.ttl * 1000) - (new Date().getTime() - rateBucket.createdAt.getTime());
            var remaining =  Math.max(0, (config.rateLimits.maxHits - rateBucket.hits));
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
