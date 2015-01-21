///////////////////////////////////////////////////////////////////////////////
// @file         : digest.js                                                 //
// @summary      : API Digest controller                                     //
// @version      : 0.1                                                       //
// @project      : apicat.us                                                 //
// @description  :                                                           //
// @author       : Benjamin Maggi                                            //
// @email        : benjaminmaggi@gmail.com                                   //
// @date         : 11 Mar 2014                                               //
// @license:     : MIT                                                       //
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
    OAuth = require('oauth').OAuth,
    OAuth2 = require('oauth/lib/oauth2').OAuth2,
    LogsCtl = require('../controllers/logs'),
    routex = require('../services/routex'),
    url = require('url'),
    config = require('../config'),
    query = require('querystring'),
    http = require('http'),
    https = require('https'),
    zlib = require('zlib'),
    crypto = require('crypto'),
    jsonValidator = require('tv4');


///////////////////////////////////////////////////////////////////////////////
// APICATUS Digestors logic                                                  //
///////////////////////////////////////////////////////////////////////////////
function escapeRegExp(str) {
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
    baseUrl = escapeRegExp(baseUrl);
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

    var pattern = routex.newPattern(route);
    return pattern.match(path);
};

//
// Check for nested value within object.
// http://stackoverflow.com/questions/6491463/accessing-nested-javascript-objects-with-string-key
//
function objectByString(obj, str) {
    str = str.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
    str = str.replace(/^\./, '');           // strip a leading dot
    var a = str.split('.');
    while (a.length) {
        var n = a.shift();
        if (obj && n in obj) {
            obj = obj[n];
        } else {
            return;
        }
    }
    return obj;
}

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

    if (!request.headers.host) {
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
    // Skip API Calls
    if(subdomainArray[0].toLowerCase() == 'api') {
        return next();
    }
    // Skip blacklist
    var blacklist = ['api', 'app', 'status', 'landing'];
    if(blacklist.indexOf(subdomainArray[0].toLowerCase()) > -1) {
        return next();
    }

    // Parse incoming url request
    var url_parts = url.parse(request.url, true, true);
    var pathname = url_parts.pathname;

    // Find Digestor matching request subdomain
    DigestorMdl.findOne({subdomain: subdomainArray[0].toLowerCase()})
    .exec(function(error, digestor) {
        if (error) {
            response.statusCode = 500;
            return next(error);
        }
        if(!digestor) {
            response.statusCode = 404;
            return response.json({ error: 'digestor not found' });
        }
        // Digest this API method
        digest(digestor, pathname, request.method);
    });

    var proxyRequest = function(options, request, response, log) {

        var post_data = JSON.stringify(request.body);
        request.pause();
        ///////////////////////////////////////////////////////////////////////
        // Match request protocol                                            //
        ///////////////////////////////////////////////////////////////////////
        var protocol = options.protocol.match('https') ? https : http;

        if(options.protocol.match('https')) {
            protocol = https;
            // Set port or default to 443 (SSL)
            options.port = options.port || 443;
        }

        console.log('proxyRequest', JSON.stringify(options, null, 4))
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
            //pipedResponse.setEncoding(request.headers['accept-encoding'] || 'utf8');
            pipedResponse.on('data', function (chunk) {
                response.write(chunk);
            });
            pipedResponse.on('end', function() {
                response.end();
            });
            pipedResponse.on('close', function() {
                console.log("response close");
            });
            pipedResponse.on('finish', function() {
                console.log("response finish");
            });
        });
        pipedRequest.on('timeout', function() {
            response.statusCode = 408;
            response.json({'title': 'error', 'message': 'timeout', 'status': 'fail'});
        });
        pipedRequest.on('error', function(error) {
            response.statusCode = 500;
            console.log('problem with request: ' + JSON.stringify(error.message, null, 4));
            response.json({'title': 'error', 'message': error.message, code: error.code, 'status': 'fail'});
        });
        // Post or Put data
        //if(options.method.toLowerCase() == 'post' || options.method.toLowerCase() == 'put') {
        if (['POST','PUT'].indexOf(options.method) !== -1 && !options.headers['Content-Length']) {
            pipedRequest.write(post_data);
        }
        pipedRequest.end();
        request.resume();
    };
    ///////////////////////////////////////////////////////////////////////////
    // Proxy Request                                                         //
    ///////////////////////////////////////////////////////////////////////////
    var proxyMethod = function(method, request, response, log) {

        request.pause();
        var proxyUrlParts = url.parse(method.proxy.URI, true, true);

        ///////////////////////////////////////////////////////////////////////
        // Setup request options                                             //
        ///////////////////////////////////////////////////////////////////////
        //request.headers['Content-length'] = ''; (skip chunked requests)

        // this will fix problems with forwarding https requests !
        // request.headers.host = proxyUrlParts.hostname;
        request.headers.host = proxyUrlParts.hostname;


        // Header Overrides
        // request.headers['Content-length'] = '';             // Prevent chunked responses

        var options = {
            hostname: proxyUrlParts.hostname,
            port: proxyUrlParts.port || 80,
            path: proxyUrlParts.path + url_parts.search,
            method: method.method.toUpperCase(),
            headers: request.headers
        };

        ///////////////////////////////////////////////////////////////////////
        // Match request protocol                                            //
        ///////////////////////////////////////////////////////////////////////
        var protocol = null;
        if(proxyUrlParts.protocol.match('https')) {
            protocol = https;
            // Set port or default to 443 (SSL)
            options.port = proxyUrlParts.port || 443;
        } else {
            protocol = http;
        }
        console.log('proxyMethod', JSON.stringify(options, null, 4))
        //console.log("proxying request to:", method.proxy.URI, "\noptions:", JSON.stringify(options, null, 4));

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
            //pipedResponse.setEncoding(request.headers['accept-encoding'] || 'utf8');
            pipedResponse.setEncoding('utf8');
            // On Data
            pipedResponse.on('data', function (chunk) {
                //log.data.out = chunk;
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
            response.json({'title': 'error', 'message': 'timeout', 'status': 'fail'});
        });
        pipedRequest.on('error', function(error) {
            response.statusCode = 500;
            console.log('problem with request: ' + error.message);
            response.json({'title': 'error', 'message': 'remote connection error', 'status': 'fail'});
        });
        // Pipe request
        request.pipe(pipedRequest);
        request.resume();
    };
    var runAssertions = function(method, request, response) {
        var tests = {
            body: function() {

            },
            headers: function() {

            },
            status: function() {

            },
            timing: function() {

            }
        }
        function ass(ass) {
            switch(ass.format) {
                case 'string':
                    return ass.source
            }
        }
        var asserts = [{
            source: 'body',
            format: 'json',
            property: 'name',
            comparsion: 'equals',
            expect: 1234
        }, {
            source: 'status',
            format: 'number',
            comparsion: '=',
            expect: 1234
        }, {
            source: 'timing',
            format: 'number',
            comparsion: '>',
            expect: 1500
        }, {
            source: 'headers',
            format: 'string',
            property: 'Content-length',
            comparsion: 'has',
            expect: 'hola'
        }];

        asserts.every(function(assert){
            return tests.apply(assert);
        });
    }
    ///////////////////////////////////////////////////////////////////////////
    // Handle Request by sending stored response                             //
    ///////////////////////////////////////////////////////////////////////////
    var handleRequest = function(method, request, response, log) {
        ///////////////////////////////////////////////////////////////
        // Set custom Response headers                               //
        ///////////////////////////////////////////////////////////////
        if(method.response.headers && method.response.headers.length > 0) {
            method.response.headers.forEach(function(header){
                if(header.name && header.value) {
                    response.set(header.name, header.value);
                }
            });
        }

        ///////////////////////////////////////////////////////////////////////
        // Validate JSON Body                                                //
        ///////////////////////////////////////////////////////////////////////
        if(method.response.validator.enabled && Object.keys(request.body).length > 0 && method.response.contentType == 'application/json') {
            var validatorOutput = jsonValidator.validateMultiple(request.body, JSON.parse(method.response.validator.schema));
            if(!validatorOutput.valid) {
                response.statusCode = 400;
                response.json(validatorOutput);
                return next();
            }
        }
        ///////////////////////////////////////////////////////////////////////
        // Set content-type & status code default use if nessesary           //
        ///////////////////////////////////////////////////////////////////////
        response.set('content-type', method.response.contentType || 'application/json');
        response.statusCode = method.response.statusCode || 200;

        ///////////////////////////////////////////////////////////////////////
        // Send data as raw buffer contet-type will take care                //
        ///////////////////////////////////////////////////////////////////////
        if(method.response.body) {
            response.send(new Buffer(method.response.body));
        } else {
            // Handle no response response body
            response.send(new Buffer(''));
        }
    };

    ///////////////////////////////////////////////////////////////////////////
    // Proxy source (Digestor or Methods)                                    //
    ///////////////////////////////////////////////////////////////////////////
    var proxySource = function(source, request, response, next, log) {
        var proxyUrlParts = url.parse(source.proxy.URI, true, true);

        //var protocol = options.protocol.match('https') ? https : http;
        var options = {
            protocol: proxyUrlParts.protocol,
            hostname: proxyUrlParts.hostname, // To support url.parse() hostname is preferred over host;
            host: source.proxy.URI,
            port: proxyUrlParts.port ? proxyUrlParts.port : proxyUrlParts.protocol.match('https') ? 443 : 80,
            //path: (source.publicPath) ? source.publicPath + url_parts.pathname : url_parts.pathname,
            path: proxyUrlParts.path + url_parts.search,
            method: request.method,
            headers: request.headers
        };
        // http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html 14.24
        options.headers.host = proxyUrlParts.hostname;

        ///////////////////////////////////////////////////////////////////////
        // Set custom Request headers                                        //
        ///////////////////////////////////////////////////////////////////////
        if(objectByString(source, 'request.headers')) {
            source.request.headers.forEach(function(header){
                if(header.name && header.value) {
                    options.headers[header.name] = header.value;
                }
            });
        }
        ///////////////////////////////////////////////////////////////////////
        // Set custom Response headers                                       //
        ///////////////////////////////////////////////////////////////////////
        if(objectByString(source, 'response.headers')) {
            source.response.headers.forEach(function(header){
                if(header.name && header.value) {
                    response.set(header.name, header.value);
                }
            });
        }

        console.log('proxySource', JSON.stringify(options, null, 4))
        if(source.authorizations && objectByString(source.authorizations[0], 'oauth[0].version') == '1.0') {
            console.log('proxy oauth 1.0')
            var doAuth = function(options, auth) {
                var oAuth = new OAuth(
                    null,
                    null,
                    auth.apiKey || null,
                    auth.apiSecret || null,
                    auth.version,
                    null,
                    auth.signature
                );
                console.log('query', JSON.stringify(request.query, null, 4));
                var querystring = query.stringify(request.query);
                var resource = options.protocol + '//' + options.hostname + options.path;
                if(querystring.length > 0) {
                    resource += '?' + querystring
                }

                console.log('resource', JSON.stringify(resource, null, 4));

                var authCallback = function(error, data, res) {
                    if (error) {
                        console.log('error', JSON.stringify(error, null, 4))
                        //response.statusCode = error.statusCode;
                        response.statusCode = 500;
                        return response.json(error);

                    } else {
                        var responseContentType = res.headers['content-type'];

                        if (/application\/javascript/.test(responseContentType)
                            || /text\/javascript/.test(responseContentType)
                            || /application\/json/.test(responseContentType)) {
                            var body = JSON.parse(data);
                        }
                    }
                    return response.send(new Buffer(data));
                };
                oAuth.getProtectedResource(
                    resource,
                    options.method,
                    null,
                    null,
                    authCallback
                );
            }
            console.log("auth: ", objectByString(source.authorizations[0], 'oauth[0]'));
            doAuth(options, objectByString(source.authorizations[0], 'oauth[0]'));
        } else if(source.authorizations && objectByString(source.authorizations[0], 'oauth[0].version') == '2.0') {
            console.log('proxy oauth 2.0')
            var doAuth = function(options, auth) {
                var oAuth = new OAuth(
                    auth.requestUri,
                    auth.accessUri,
                    auth.apiKey || null,
                    auth.apiSecret || null,
                    auth.version,
                    null,
                    auth.signature
                );
                // Get the request token
                oAuth.getOAuthRequestToken(function(err, oauth_token, oauth_token_secret, results ){
                    console.log('==>Get the request token');
                    console.log(arguments);
                });


                // Get the authorized access_token with the un-authorized one.
                oAuth.getOAuthAccessToken('requestkey', 'requestsecret', function (err, oauth_token, oauth_token_secret, results){
                    console.log('==>Get the access token');
                    console.log(arguments);
                });
                console.log('query', JSON.stringify(request.query, null, 4));
                var querystring = query.stringify(request.query);
                var resource = options.protocol + '//' + options.hostname + options.path;
                if(querystring.length > 0) {
                    resource += '?' + querystring
                }

                console.log('resource', JSON.stringify(resource, null, 4));

                var authCallback = function(error, data, res) {
                    if (error) {
                        console.log('error', JSON.stringify(error, null, 4))
                        //response.statusCode = error.statusCode;
                        response.statusCode = 500;
                        return response.json(error);

                    } else {
                        var responseContentType = res.headers['content-type'];

                        if (/application\/javascript/.test(responseContentType)
                            || /text\/javascript/.test(responseContentType)
                            || /application\/json/.test(responseContentType)) {
                            var body = JSON.parse(data);
                        }
                    }
                    return response.send(new Buffer(data));
                };
                oAuth.getProtectedResource(
                    resource,
                    options.method,
                    null,
                    null,
                    authCallback
                );
            }
        } else if(source.authorizations && objectByString(source.authorizations[0], 'key[0].apiKey')) {
            console.log('proxy signature key')
            if(objectByString(source.authorizations[0], 'key[0].location') == 'header') {
                options.headers[objectByString(source.authorizations[0], 'key[0].param')] = objectByString(source.authorizations[0], 'key[0].apiKey');
                return proxyRequest(options, request, response, log);
            } else {
                options.path += '?' + objectByString(source.authorizations[0], 'key[0].param') + '=' + objectByString(source.authorizations[0], 'key[0].apiKey');
                return proxyRequest(options, request, response, log);
            }
        } else if(source.authorizations && objectByString(source.authorizations[0], 'auth[0].basicAuth')) {
            // Basic Auth support
            options.headers['Authorization'] = 'Basic ' + new Buffer(objectByString(source.authorizations[0], 'auth[0].apiUsername') + ':' + 'auth[0].apiPassword').toString('base64');
            console.log(options.headers['Authorization'] );
        } else {
            return proxyRequest(options, request, response, log);
        }
    };
    ///////////////////////////////////////////////////////////////////////////
    // Proxy Digestor                                                        //
    ///////////////////////////////////////////////////////////////////////////
    var proxyDigestor = function(digestor, request, response, log) {
        var proxyUrlParts = url.parse(digestor.proxy.URI, true, true);

        var options = {
            protocol: proxyUrlParts.protocol,
            hostname: proxyUrlParts.hostname, // To support url.parse() hostname is preferred over host;
            host: digestor.proxy.URI,
            port: proxyUrlParts.port | 80,
            path: (digestor.publicPath) ? digestor.publicPath + url_parts.pathname : url_parts.pathname,
            method: request.method,
            headers: request.headers
        };
        // http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html 14.24
        options.headers.host = proxyUrlParts.hostname;

        ///////////////////////////////////////////////////////////////////////
        // Set custom Request headers                                        //
        ///////////////////////////////////////////////////////////////////////
        //if(digestor.request && digestor.request.headers && digestor.request.headers.length > 0) {
        if(objectByString(digestor, 'request.headers')) {
            digestor.request.headers.forEach(function(header){
                if(header.name && header.value) {
                    options.headers[header.name] = header.value;
                }
            });
        }
        ///////////////////////////////////////////////////////////////
        // Set custom Response headers                               //
        ///////////////////////////////////////////////////////////////
        //if(digestor.response && digestor.response.headers && digestor.response.headers.length > 0) {
        if(objectByString(digestor, 'response.headers')) {
            digestor.response.headers.forEach(function(header){
                if(header.name && header.value) {
                    response.set(header.name, header.value);
                }
            });
        }

        /*
        options = {
            protocol: 'http:',
            hostname: 'walmartlabs.api.mashery.com',
            port: 80,
            path: '/v1/vod',
            method: 'GET'
        }
        console.log('request.headers', JSON.stringify(request.headers, null, 4))
        var callApi = http.request(options, function(result) {
            result.setEncoding('utf8');
            result.on('data', function(data){
                console.log('data')
                response.write(new Buffer(data));
            })
            .on('end', function() {
                response.end();
            });

        })
        callApi.end();
        //console.log('proxyDigestor', JSON.stringify(options, null, 4))

        /*http.get("http://qa-plattform.securityscorecard.io/js/main.js", function(file) {
            console.log("RRRR: ", file.statusCode);

            file.on('data', function(data) {
                //file.write(data);
                response.write(new Buffer(data));
            })
            .on('end', function() {
                //file.end();
                response.end();
            });
        });*/
        /*var rqq = http.request(options, function(file) {
            file.on('data', function(data) {
                response.write(new Buffer(data));
            })
            .on('end', function() {
                response.end();
            });
        });
        rqq.end();
        */
        //return response.json(options);
        console.log('proxyDigestor', JSON.stringify(options, null, 4))
        if(digestor.authorizations && objectByString(digestor.authorizations[0], 'oauth[0].version') == '1.0') {
            console.log('proxy oauth 1.0')
            var doAuth = function(options, auth) {
                var oAuth = new OAuth(
                    null,
                    null,
                    auth.apiKey || null,
                    auth.apiSecret || null,
                    auth.version,
                    null,
                    auth.signature
                );
                console.log('query', JSON.stringify(request.query, null, 4));
                var querystring = query.stringify(request.query);
                var resource = options.protocol + '//' + options.hostname + options.path;
                if(querystring.length > 0) {
                    resource += '?' + querystring
                }

                console.log('resource', JSON.stringify(resource, null, 4));

                var authCallback = function(error, data, res) {
                    if (error) {
                        console.log('error', JSON.stringify(error, null, 4))
                        //response.statusCode = error.statusCode;
                        response.statusCode = 500;
                        return response.json(error);

                    } else {
                        var responseContentType = res.headers['content-type'];

                        if (/application\/javascript/.test(responseContentType)
                            || /text\/javascript/.test(responseContentType)
                            || /application\/json/.test(responseContentType)) {
                            var body = JSON.parse(data);
                        }
                    }
                    return response.send(new Buffer(data));
                };
                oAuth.getProtectedResource(
                    resource,
                    options.method,
                    null,
                    null,
                    authCallback
                );
            }
            doAuth(options, objectByString(digestor.authorizations[0], 'oauth[0]'));
        } else if(digestor.authorizations && objectByString(digestor.authorizations[0], 'oauth[0].version') == '2.0') {
            console.log('proxy oauth 2.0')
            var doAuth = function(options, auth) {
                var oAuth = new OAuth(
                    auth.requestUri,
                    auth.accessUri,
                    auth.apiKey || null,
                    auth.apiSecret || null,
                    auth.version,
                    null,
                    auth.signature
                );
                // Get the request token
                oAuth.getOAuthRequestToken(function(err, oauth_token, oauth_token_secret, results ){
                    console.log('==>Get the request token');
                    console.log(arguments);
                });


                // Get the authorized access_token with the un-authorized one.
                oAuth.getOAuthAccessToken('requestkey', 'requestsecret', function (err, oauth_token, oauth_token_secret, results){
                    console.log('==>Get the access token');
                    console.log(arguments);
                });
                console.log('query', JSON.stringify(request.query, null, 4));
                var querystring = query.stringify(request.query);
                var resource = options.protocol + '//' + options.hostname + options.path;
                if(querystring.length > 0) {
                    resource += '?' + querystring
                }

                console.log('resource', JSON.stringify(resource, null, 4));

                var authCallback = function(error, data, res) {
                    if (error) {
                        console.log('error', JSON.stringify(error, null, 4))
                        //response.statusCode = error.statusCode;
                        response.statusCode = 500;
                        return response.json(error);

                    } else {
                        var responseContentType = res.headers['content-type'];

                        if (/application\/javascript/.test(responseContentType)
                            || /text\/javascript/.test(responseContentType)
                            || /application\/json/.test(responseContentType)) {
                            var body = JSON.parse(data);
                        }
                    }
                    return response.send(new Buffer(data));
                };
                oAuth.getProtectedResource(
                    resource,
                    options.method,
                    null,
                    null,
                    authCallback
                );
            }
        } else if(digestor.authorizations && objectByString(digestor.authorizations[0], 'key[0].apiKey')) {
            console.log('proxy signature key')
            if(objectByString(digestor.authorizations[0], 'key[0].location') == 'header') {
                options.headers[objectByString(digestor.authorizations[0], 'key[0].param')] = objectByString(digestor.authorizations[0], 'key[0].apiKey');
                return proxyRequest(options, request, response, log);
            } else {
                options.path += '?' + objectByString(digestor.authorizations[0], 'key[0].param') + '=' + objectByString(digestor.authorizations[0], 'key[0].apiKey');
                return proxyRequest(options, request, response, log);
            }
        } else {
            return proxyRequest(options, request, response, log);
        }
    };
    ///////////////////////////////////////////////////////////////////////////
    // Learn Request                                                         //
    ///////////////////////////////////////////////////////////////////////////
    var learnRequest = function(digestor, route, httpMethod, request, response, log) {

        var endpoint = digestor.endpoints.filter(function(endpoint) {
            return endpoint.name == 'Learned methods';
        });

        if(!endpoint.length) {
            endpoint = digestor.endpoints = [{
                name: 'Learned methods',
                synopsis: 'Recorded calls from apicatus',
                methods: []
            }];
        }

        endpoint[0].methods.push({
            name: route,
            synopsis: 'Recorded method',
            URI: route,
            method: httpMethod
        });

        /*digestor.update({
            $push: {'endpoints': method}
        }, {
            upsert: true
        }, function(err, digestor){
            if(err){
                res.json(err);
                return next();
            }
            return response.json(digestor);
        });*/
        digestor.save(function(error, digestor){
            if (error) {
                console.log('save error', error);
                return next(error);
            }
            if(!digestor) {
                response.statusCode = 404;
                return response.json({'title': 'error', 'message': 'Cannot create', 'status': 'fail'});
            }
            ///////////////////////////////////////////////////////////////
            // If proxy is enabled and valid then pipe request           //
            ///////////////////////////////////////////////////////////////
            if(digestor.proxy && digestor.proxy.enabled && digestor.proxy.URI) {
                proxyDigestor(digestor, request, response, log);
            } else {
                // Maybe send empty null response but ok ?
                response.statusCode = 200;
                return response.json({action: 'endpoint recorded', endpoint: endpoint, result: true});
            }
        });
    };

    ///////////////////////////////////////////////////////////////////////////
    // Return matching method by route & verb                                //
    ///////////////////////////////////////////////////////////////////////////
    var getMethodByRoute = function(digestor, route, httpMethod) {
        var method = null;
        for(var i = 0; i < digestor.endpoints.length; i++) {
            method = digestor.endpoints[i].methods.filter(function(method) {
                return (exports.pathMatch(method.URI, route) && httpMethod.toUpperCase() === method.method.toUpperCase());
            });
            if(method.length) {
                return method[0];
            }
        }
        return null;
    };
    ///////////////////////////////////////////////////////////////////////////
    // Digest API Requests                                                   //
    ///////////////////////////////////////////////////////////////////////////
    var digest = function(digestor, route, httpMethod) {

        var method = getMethodByRoute(digestor, route, httpMethod);
        if(method) {
            ///////////////////////////////////////////////////////////////////
            // Log request                                                   //
            ///////////////////////////////////////////////////////////////////
            if(digestor.logging) {
                var log = LogsCtl.create(request, response, next);
                log.digestor = digestor._id;
                log.method = method._id;
            }
            ///////////////////////////////////////////////////////////////////
            // If proxy is enabled and valid then pipe request               //
            ///////////////////////////////////////////////////////////////////
            if(digestor.proxy && digestor.proxy.enabled && digestor.proxy.URI) {
                console.log('proxy all')
                //proxySource(digestor, request, response, next, log);
                //proxyDigestor(digestor, request, response, log);
            } else if(method.proxy && method.proxy.enabled && method.proxy.URI) {
                proxySource(method, request, response, next, log);
                //proxyMethod(method, request, response, log);
            } else {
                handleRequest(method, request, response, log);
            }
        } else if (digestor.learn) {
            ///////////////////////////////////////////////////////////////////
            // Learn methods from requests                                   //
            ///////////////////////////////////////////////////////////////////
            var endpoint = digestor.endpoints.filter(function(endpoint) {
                return endpoint.name == 'Learned methods';
            });

            if(!endpoint.length) {
                endpoint = digestor.endpoints = [{
                    name: 'Learned methods',
                    synopsis: 'Recorded calls from apicatus',
                    methods: []
                }];

                digestor.save(function(error, digestor){
                    if (error) {
                        console.log('save error', error);
                        return next(error);
                    }
                    learnRequest(digestor, route, httpMethod, request, response, log);
                });
            } else {
                learnRequest(digestor, route, httpMethod, request, response, log);
            }
        } else {
            response.statusCode = 404;
            return next();
        }
    };
};
