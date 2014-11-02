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

var DigestorMdl = require('../models/digestor'),
    LogsCtl = require('../controllers/logs'),
    url = require('url'),
    config = require('../config'),
    http = require('http'),
    https = require('https'),
    jsonValidator = require('tv4');


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
///////////////////////////////////////////////////////////////////////////////
exports.digestRequest = function(request, response, next) {
    'use strict';

    console.log("-------------------------------------------------------------------------------");
    console.log("digest", request.url);
    console.log("-------------------------------------------------------------------------------");
    if (!request.headers.host) {
        console.log("skip digest");
        return next();
    }
    // create our subdomain regex
    var regex = subdomainRegex(config.baseUrl);
    // extract the subdomain string from the req.url
    var subdomainString = regex.exec(request.headers.host);
    // if there is no subdomain, return
    if(!subdomainString) {
        return next();
    }
    // create an array of subdomains
    var subdomainArray = subdomainString[1].split('.');
    // console.log("subdomainArray", subdomainArray);

    var url_parts = url.parse(request.url, true, true);
    var pathname = url_parts.pathname;

    // Lookup
    //DigestorMdl.findOne({'endpoints.methods.URI':  pathname}, 'endpoints.methods')
    DigestorMdl.findOne({subdomain: subdomainArray[0].toLowerCase()})
    .exec(function(error, digestor) {
        if (error) {
            response.statusCode = 500;
            return next(error);
        }
        if(!digestor) {
            response.statusCode = 404;
            return response.json({ error: "digestor not found" });
        }
        digest(digestor, pathname, request.method);
    });

    var proxyRequest = function(method, request, response, log) {

        request.pause();
        var proxyUrlParts = url.parse(method.proxy.URI, true, true);

        ///////////////////////////////////////////////////////////////////////
        // Setup request options                                             //
        ///////////////////////////////////////////////////////////////////////
        //request.headers['Content-length'] = '';

        var options = {
            hostname: proxyUrlParts.hostname,
            port: proxyUrlParts.port | 80,
            path: proxyUrlParts.path + url_parts.search,
            method: method.method.toUpperCase(),
            headers: request.headers
        };

        ///////////////////////////////////////////////////////////////////////
        // Match request protocol                                            //
        ///////////////////////////////////////////////////////////////////////
        var protocol = null;
        if(proxyUrlParts.protocol.match("https")) {
            protocol = https;
            // Set port or default to 443 (SSL)
            options.port = proxyUrlParts.port || 443;
        } else {
            protocol = http;
        }
        console.log("proxying request to:", method.proxy.URI, "\noptions:", JSON.stringify(options, null, 4));

        var pipedRequest = protocol.request(options, function(pipedResponse) {
            // Set status
            response.statusCode = pipedResponse.statusCode;
            // Set headers
            for(var header in pipedResponse.headers) {
                if(pipedResponse.headers.hasOwnProperty(header)) {
                    response.set(header, pipedResponse.headers[header]);
                }
            }
            // Default encodnig
            pipedResponse.setEncoding('utf8');
            pipedResponse.on('data', function (chunk) {
                log.data = chunk;
            });
            pipedResponse.on('end', function() {                
                console.log("response ended");
                //response.writeHeader(pipedResponse.statusCode, pipedResponse.headers);
                //response.end();
            });
            pipedResponse.on('close', function() {
                console.log("response close");
            });
            pipedResponse.on('finish', function() {
                console.log("response finish");
            });
            pipedResponse.pause();
            pipedResponse.pipe(response);
            pipedResponse.resume();
        });
        pipedRequest.on('timeout', function() {
            response.statusCode = 408;
            response.json({"title": "error", "message": "timeout", "status": "fail"});
        });
        pipedRequest.on('error', function(error) {
            response.statusCode = 500;
            console.log('problem with request: ' + error.message);
            response.json({"title": "error", "message": "remote connection error", "status": "fail"});
        });
        // Pipe request
        request.pipe(pipedRequest);
        request.resume();
    };
    var getMethodByRoute = function(digestor, route, httpMethod) {
        var method = null;
        for(var i = 0; i < digestor.endpoints.length; i++) {
            method = filterMethods(digestor.endpoints[i], route, httpMethod);
            if(method.length > 0) {
                break;
            }
        }
        function filterMethods(method, route, httpMethod) {
            return digestor.endpoints[i].methods.filter(function(method) {
                return (exports.pathMatch(method.URI, route) && httpMethod.toUpperCase() === method.method.toUpperCase());
            });
        }
        return method[0];
    };
    var digest = function(digestor, route, httpMethod) {
        var validatorOutput = null;
        var method = getMethodByRoute(digestor, route, httpMethod);
        if(method) {
            ///////////////////////////////////////////////////////////////
            // Log request                                               //
            ///////////////////////////////////////////////////////////////
            var log = LogsCtl.create(request, response, next);
            log.digestor = digestor._id;
            log.method = method._id;
            ///////////////////////////////////////////////////////////////
            // If proxy is enabled and valid then pipe request           //
            ///////////////////////////////////////////////////////////////
            if(method.proxy && method.proxy.enabled && method.proxy.URI) {
                proxyRequest(method, request, response, log);
            } else {

                ///////////////////////////////////////////////////////////////
                // Set custom headers                                        //
                ///////////////////////////////////////////////////////////////
                if(method.response.headers && method.response.headers.length > 0) {
                    method.response.headers.forEach(function(header){
                        if(header.name && header.value) {
                            response.set(header.name, header.value);
                        }
                    });
                }

                ///////////////////////////////////////////////////////////////
                // Validate input data                                       //
                ///////////////////////////////////////////////////////////////
                if(method.response.validator.enabled && Object.keys(request.body).length > 0 && method.response.contentType == 'application/json') {
                    validatorOutput = jsonValidator.validateMultiple(request.body, JSON.parse(method.response.validator.schema));
                    if(!validatorOutput.valid) {
                        response.statusCode = 400;
                        response.json(validatorOutput);
                        return next();
                    }
                }
                ///////////////////////////////////////////////////////////////
                // Set content-type & status code default use if nessesary   //
                ///////////////////////////////////////////////////////////////
                response.set('content-type', method.response.contentType || 'application/json');
                response.statusCode = method.response.statusCode || 200;

                ///////////////////////////////////////////////////////////////
                // Send data as raw buffer contet-type will take care        //
                ///////////////////////////////////////////////////////////////
                if(method.response.body) {
                    response.send(new Buffer(method.response.body));
                } else {
                    // Handle no response response body
                    response.send(new Buffer(""));
                }
            }
        } else {
            response.statusCode = 404;
            return next();
        }
    };
};
