///////////////////////////////////////////////////////////////////////////////
// @file         : digest.js                                                 //
// @summary      : API Digest controller                                     //
// @version      : 0.1                                                       //
// @project      : apicat.us                                                 //
// @description  :                                                           //
// @author       : Benjamin Maggi                                            //
// @email        : benjaminmaggi@gmail.com                                   //
// @date         : 11 Mar 2014                                               //
// ------------------------------------------------------------------------- //
//                                                                           //
// @copyright Copyright 2014 Benjamin Maggi, all rights reserved.            //
//                                                                           //
//                                                                           //
// License:                                                                  //
// This program is free software; you can redistribute it                    //
// and/or modify it under the terms of the GNU General Public                //
// License as published by the Free Software Foundation;                     //
// either version 2 of the License, or (at your option) any                  //
// later version.                                                            //
//                                                                           //
// This program is distributed in the hope that it will be useful,           //
// but WITHOUT ANY WARRANTY; without even the implied warranty of            //
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the             //
// GNU General Public License for more details.                              //
//                                                                           //
///////////////////////////////////////////////////////////////////////////////

var DigestorMdl = require('../models/digestor'),
    LogsCtl = require('../controllers/logs'),
    url = require('url'),
    config = require('../config'),
    http = require('http'),
    https = require('https');


///////////////////////////////////////////////////////////////////////////////
// APICATUS Digestors logic                                                  //
///////////////////////////////////////////////////////////////////////////////
function _escapeRegExp(str) {
    'use strict';
    return str.replace(/[-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

///////////////////////////////////////////////////////////////////////////////
// Creates the custom regex object from the specified baseUrl                //
//                                                                           //
// @param  {string} baseUrl [description]                                    //
// @return {Object} the regex object                                         //
///////////////////////////////////////////////////////////////////////////////
function subdomainRegex(baseUrl) {
    'use strict';

    var regex;
    baseUrl = _escapeRegExp(baseUrl);
    regex = new RegExp('((?!www)\\b[-\\w\\.]+)\\.' + baseUrl + '(?::)?(?:\\d+)?');
    return regex;
}

///////////////////////////////////////////////////////////////////////////////
// Path validatos & match to route                                           //
//                                                                           //
// @param  {string} route [in the form of /base/:id]                         //
// @param  {string} path [url path in the form of /path/to/resource]         //
// @return {Array} null or matched result                                    //
///////////////////////////////////////////////////////////////////////////////
exports.pathMatch = function(route, path) {
    'use strict';

    var PATH_REPLACER = "([^\/]+)";
    var PATH_NAME_MATCHER = /:([\w\d]+)/g;
    var param_names = [];
    var path_match = null;

    // find the names
    while ((path_match = PATH_NAME_MATCHER.exec(path)) !== null) {
        param_names.push(path_match[1]);
    }
    // replace with the path replacement
    route = new RegExp(route.replace(PATH_NAME_MATCHER, PATH_REPLACER) + "$");
    return path.match(route);
};

///////////////////////////////////////////////////////////////////////////////
// Digest API request                                                        //
//                                                                           //
// @param {Object} request                                                   //
// @param {Object} response                                                  //
// @param {Object} next                                                      //
//                                                                           //
// @api private                                                              //
//                                                                           //
///////////////////////////////////////////////////////////////////////////////
exports.digestRequest = function(request, response, next) {
    'use strict';

    console.log("digest");
    if (!request.headers.host) {
        console.log("skip digest");
        return next();
    }
    // create our subdomain regex
    var regex = subdomainRegex(config.baseUrl);
    // extract the subdomain string from the req.url
    var subdomainString = regex.exec(request.headers.host);
    // if there is no subdomain, return
    if(!subdomainString) return next();
    // create an array of subdomains
    var subdomainArray = subdomainString[1].split('.');
    console.log("subdomainArray", subdomainArray);

    var url_parts = url.parse(request.url, true, true);
    var pathname = url_parts.pathname;
    // Lookup
    //DigestorMdl.findOne({'endpoints.methods.URI':  pathname}, 'endpoints.methods')
    DigestorMdl.findOne({name: subdomainArray[0]})
    .exec(function(error, digestor) {
        if (error) {
            response.status(500);
            return next(error);
        }
        if(!digestor) {
            response.status(404);
            return response.json({ error: "digestor not found" });
        }
        digest(digestor);
    });

    var proxyRequest = function(method, request, response, log) {
        request.pause();
        var proxyUrlParts = url.parse(method.proxy.URI, true, true);
        var options = {
            host: proxyUrlParts.hostname,
            port: proxyUrlParts.port | 80,
            path: proxyUrlParts.path,
            method: method.method.toUpperCase(),
            headers: request.headers
        };
        var protocol = null;
        if(proxyUrlParts.protocol.match("https")) {
            protocol = https;
            options.port = proxyUrlParts.port || 443;
        } else {
            protocol = http;
        }
        console.log("proxying request to:", method.proxy.URI, "options:", options, "proto: ", proxyUrlParts.protocol);

        var pipeRequest = protocol.request(options, function(pipedResponse) {
            pipedResponse.setEncoding('utf8');
            pipedResponse.on('data', function (chunk) {
                log.data += chunk;
            });
            pipedResponse.on('end', function() {
                console.log("response ended");
            });
            pipedResponse.pause();
            // Update headers from proxy
            response.writeHeader(pipedResponse.statusCode, pipedResponse.headers);
            pipedResponse.pipe(response);
            pipedResponse.resume();
        });
        pipeRequest.on('timeout', function() {
            response.statusCode = 408;
            response.json({"title": "error", "message": "timeout", "status": "fail"});
        });
        pipeRequest.on('error', function(error) {
            response.statusCode = 500;
            console.log('problem with request: ' + error.message);
            response.json({"title": "error", "message": "remote connection error", "status": "fail"});
        });
        // Pipe request
        request.pipe(pipeRequest);
        request.resume();
    };
    var digest = function(digestor) {
        // Lookup digestors
        for(var i = 0; i < digestor.endpoints.length; i++) {
            var endpoint = digestor.endpoints[i];
            // Looup endpoints
            for(var j = 0; j < endpoint.methods.length; j++) {
                var method = endpoint.methods[j];
                //console.log(request.method.toUpperCase(), " path: ", method.URI);
                if(exports.pathMatch(method.URI, pathname)) {
                    if(request.method.toUpperCase() === method.method.toUpperCase()) {

                        //console.log("route: ", method.URI, " path: ", pathname, " match: ", exports.pathMatch(method.URI, pathname));
                        var log = LogsCtl.create(request, response, next);
                        log.digestor = digestor._id;
                        log.method = method._id;
                        if(method.proxy.enabled && method.proxy.URI) {
                            proxyRequest(method, request, response, log);
                        }
                    } else {
                        response.statusCode = 404;
                        return next();
                    }
                }
            }
        }
    };
};
