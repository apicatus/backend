var express = require('express'),
    conf = require('../config'),
    AccountMdl = require('../models/account'),
    AccountCtl = require('../controllers/account'),
    DigestorMdl = require('../models/digestor')
    DigestorCtl = require('../controllers/digestor'),
    LogsCtl = require('../controllers/logs'),
    FileSystem = require('fs'),
    util = require('util'),
    vm = require('vm'),
    url = require('url'),
    SocketIo = require('socket.io'),
    http = require('http'),
    https = require('https'),
    httpProxy = require('http-proxy');


// var proxy = httpProxy.RoutingProxy();
///////////////////////////////////////////////////////////////////////////////
// APICATUS Digestors logic                                                  //
///////////////////////////////////////////////////////////////////////////////
function _escapeRegExp(str) {
    return str.replace(/[-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}


/**
 * Creates the custom regex object from the specified baseUrl
 *
 * @param  {string} baseUrl [description]
 * @return {Object} the regex object
 */
function subdomainRegex(baseUrl){
    var regex;

    baseUrl = _escapeRegExp(baseUrl);

    regex = new RegExp('((?!www)\\b[-\\w\\.]+)\\.' + baseUrl + '(?::)?(?:\d+)?');

    return regex;
}
exports.pathMatch = function(route, path) {
    var PATH_REPLACER = "([^\/]+)";
    var PATH_NAME_MATCHER = /:([\w\d]+)/g;
    var QUERY_STRING_MATCHER = /\?([^#]*)?$/;
    var param_names = [];

    // find the names
    while ((path_match = PATH_NAME_MATCHER.exec(path)) !== null) {
        param_names.push(path_match[1]);
    }

    // replace with the path replacement
    route = new RegExp(route.replace(PATH_NAME_MATCHER, PATH_REPLACER) + "$");

    return path.match(route);
};

exports.digestRequest = function(request, response, next) {
    console.log("digest")
    //return next();

    if (!request.headers.host) {
        console.log("skip digest");
        return next();
    }
    // original req.url
    var originalUrl = request.headers.host + request.url;

    // create our subdomain regex
    var regex = subdomainRegex("miapi.com");

    // extract the subdomain string from the req.url
    var subdomainString = regex.exec(request.headers.host);

    //console.log("subdomainString", subdomainString);

    // if there is no subdomain, return
    if(!subdomainString) return next();

    // create an array of subdomains
    subdomainArray = subdomainString[1].split('.');

    console.log("subdomainArray", subdomainArray);


    var host = request.headers.host.split(':')[0];
    var subdomain = host.split( "." )[ 0 ];
    var filename = "./digestors/deedee.js";
    var url_parts = url.parse(request.url, true, true);
    var pathname = url_parts.pathname;
    var query = url_parts.query;

    //console.log("query: ", request.url, " route: ", url_parts.pathname, " subdomain: " , subdomain , " body: ", request.body, " method: ", request.method);

    var proxyRequest = function(request, response, log, cb) {
        var options = {
            host: 'api.github.com',
            port: 443,
            path: request.url,
            method: 'GET',
            path: '/gists/9398333',
            headers: {'user-agent': 'Mozilla/5.0'}
        };
        var req = https.request(options, function(response) {
            //console.log('STATUS: ' + response.statusCode);
            //console.log('HEADERS: ' + JSON.stringify(response.headers));
            response.setEncoding('utf8');
            response.on('data', function (chunk) {
                cb(chunk);
                log.data += chunk;
            });
            response.on('end', function() {
                //console.log(log);
                console.log("response ended");
            });
        });
        req.on('error', function(error) {
            console.log('problem with request: ' + error.message);
        });
        // write data to request body
        req.write(JSON.stringify(request.body));
        req.end();
    };
    var gotDigestor = function(error, digestor) {
        if (error) {
            response.status(500);
            return next(error);
        }
        if(!digestor) {
            response.status(404);
            return response.json({ error: "digestor not found" });
        }


        for(var i = 0; i < digestor.endpoints.length; i++) {
            var endpoint = digestor.endpoints[i];
            for(var j = 0; j < endpoint.methods.length; j++) {
                var method = endpoint.methods[j];
                console.log(request.method.toUpperCase());
                if(exports.pathMatch(method.URI, pathname)) {
                    if(request.method.toUpperCase() === method.method.toUpperCase()) {

                        console.log("route: ", method.URI, " path: ", pathname, " match: ", exports.pathMatch(method.URI, pathname));
                        var log = LogsCtl.create(request, response, next);
                        log.digestor = digestor._id;
                        log.method = method._id;
                        proxyRequest(request, response, log, function(data){
                            response.status(200);
                            return response.send(data);
                        });

                    } else {
                        response.statusCode = 404;
                        return next();
                    }
                }
            }
        }
        //LogsCtl.create(request, response, next);
        //response.status(200);
        //return response.json({endpoint: digestor.endpoints[0]});
    };

    DigestorMdl.findOne({name: subdomainArray[0]}, gotDigestor);

    /*
    DigestorMdl.findOne({name: subdomain}, gotDigestor);
    function gotDigestor(error, digestor) {
        if (error) {
            return next(error);
        }
        if(!digestor) {
            return next();
        }
        var sandbox = {
            test: [],
            "__dirname": __dirname,
            require: require,
            FileSystem: FileSystem,
            console: console,
            exports: exports,
            api: digestor,
        }
        FileSystem.readFile(filename, 'utf8', function(error, data) {
            if (error) {
                return next(error);
            }
            var ctx = vm.createContext(sandbox);
            var script = vm.createScript(data);
            script.runInContext(ctx);
            var result = ctx.processResource(request, response, next);
            //console.log(ctx);
            for(var i = 0; i < ctx.api.entries.length; i += 1) {
                console.log(ctx.api.entries[i].hits);
                //digestor.entries[2].hits = 22;
                extend(digestor.entries[i], ctx.api.entries[i]);
            }

            digestor.save(onSaved);

            function onSaved(error, data) {
                if (error) {
                    console.log(error);
                    return next(error);
                }
                console.log("digestor saved");
                //console.log(data)
            }
            return result;
        });
    }
    */
}