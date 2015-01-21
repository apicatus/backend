///////////////////////////////////////////////////////////////////////////////
// @file         : digestor.js                                               //
// @summary      : Digestor schema                                           //
// @version      : 0.1                                                       //
// @project      : apicat.us                                                 //
// @description  :                                                           //
// @author       : Benjamin Maggi                                            //
// @email        : benjaminmaggi@gmail.com                                   //
// @date         : 6 Oct 2013                                                //
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

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var Basic = new Schema({
    apiUsername: { type: String, required: true },
    apiPassword: { type: String, required: true }
});
var Oauth = new Schema({
    version: { type: String, required: true, default: '1.0', enum: [ '1.0', '2.0' ] },
    type: { type: String, required: false, default: 'authorization-code', trim: true },
    baseUri: { type: String, required: false, trim: true },
    authorizeUri: { type: String, required: false, trim: true },
    accessTokenUri: { type: String, required: false, trim: true },
    requestUri: { type: String, required: false, trim: true },
    accessUri: { type: String, required: false, trim: true },
    token: {
        param: { type: String, required: false, default: 'oauth_token', trim: true },
        location: { type: String, required: false, default: 'query', trim: true, enum: [ 'query', 'header' ] }
    },
    apiKey: { type: String, required: true },
    apiSecret: { type: String, required: true },
    signature: { type: String, required: false, default: 'HMAC-SHA1', trim: true, enum: [ 'PLAINTEXT', 'HMAC-SHA1' , 'RSA-SHA1' ] }
});
var Key = new Schema({
    apiKey: { type: String, required: true },
    param: { type: String, required: false, default: 'key', trim: true },
    location: { type: String, required: false, default: 'query', trim: true, enum: [ 'query', 'header' ] },
    signature: {
        type: { type: String, required: false, default: 'signed_sha256', trim: true, enum: [ 'signed_md5', 'signed_sha256' ] },
        param: { type: String, required: false, trim: true },
        digest: { type: String, required: false, default: 'hex', trim: true, enum: [ 'hex', 'base64', 'binary'] },
        location: { type: String, required: false, default: 'query', trim: true, enum: [ 'query', 'header' ] }
    }
});
///////////////////////////////////////////////////////////////////////////////
// Autentication type schemas                                                //
///////////////////////////////////////////////////////////////////////////////
var Authorization = new Schema({
    basicAuth: [ Basic ],
    oauth: [ Oauth ],
    key: [ Key ]
});
var Parameters = new Schema({
    name: { type: String, required: true, trim: true },
    required: { type: Boolean, default: true, required: false },
    synopsis: { type: String, required: false },
    default: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true }
});
var Assertions = new Schema({
    source: { type: Number, required: true, default: 0 },
    assertion: { type: Number, required: true, default: 0 },
    property: { type: String, required: false, trim: true },
    value: { type: String, required: false, trim: true }
});
var Methods = new Schema({
    name: { type: String, required: true, trim: true },
    nickname: { type: String, required: false, trim: true },
    synopsis: { type: String, required: false },
    URI: { type: String, required: true, trim: true },
    consumes: { type: String, required: false },
    method: { type: String, required: true, trim: true, uppercase: true },
    proxy: {
        URI:  { type: String, required: false, trim: true },
        enabled: { type: Boolean, required: false, default: false }
    },
    parameters: [ Parameters ],
    response: {
        statusCode: { type: Number, required: false, default: 200, min: 100, max: 600},
        headers: { type: Object, required: false },
        // TODO: convert to Buffer
        body: { type: String, required: false },
        validator: {
            schema: { type: Object, required: false },
            enabled: { type: Boolean, required: false, default: false }
        },
        contentType: { type: String, required: false }
    },
    assertions: [ Assertions ],
    authorizations: { type: Schema.Types.ObjectId, ref: 'Authorization' }
});
var Endpoints = new Schema({
    name: { type: String, required: false, default: "Endpoint name", trim: true },
    synopsis: { type: String, required: false },
    methods: [ Methods ]
});
var Digestor = new Schema({
    // Name of the API Digestor
    name: { type: String, required: true, trim: true },
    // Description
    synopsis: { type: String, required: false, default: "API description", trim: false },
    // Type of API
    type: { type: String, required: false, default: "REST", enum: [ 'REST', 'SOAP', 'STREAM' ] },
    // Version
    version: { type: String, required: false },
    // Full path prefix prepended to all method URIs
    publicPath: { type: String, required: false, trim: true },
    // Full path prefix prepended to all method URIs for OAuth protected method resources.
    privatePath: { type: String, required: false, trim: true },
    // Subdomain
    subdomain: { type: String, required: false, trim: false, lowercase: true },
    // Protocol
    protocol: { type: String, required: false, default: "http", enum: [ 'http', 'https' ] },
    // Allow cross domain requests
    allowCrossDomain: { type: Boolean, default: true, required: false },
    // API Logging
    logging: { type: Boolean, default: true, required: false },
    // Creation Date
    created: { type: Date, default: Date.now },
    // Last modification date
    lastUpdate: { type: Date, default: Date.now },
    // Last time used
    lastAccess: { type: Date, default: Date.now },
    // Enabled
    enabled: { type: Boolean, default: true, required: false },
    // Visible to all users
    public: { type: Boolean, default: false, required: false },
    // Color
    color: { type: String, default: false, required: false, uppercase: true, match: /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i },
    // Endpoint resource array
    endpoints: [ Endpoints ],
    // API Call counter
    hits: { type: Number, default: 0, required: false },
    // List of owners
    owners: [{ type: Schema.Types.ObjectId, ref: 'Account' }],
    // Learning mode
    learn: { type: Boolean, default: false, required: false },
    // Global API Proxy
    proxy: {
        URI:  { type: String, required: false, trim: true },
        enabled: { type: Boolean, required: false, default: false }
    },
    request: {
        headers: { type: Object, required: false },
        query: { type: Object, required: false },
        contentType: { type: String, required: false }
    },
    response: {
        headers: { type: Object, required: false },
        contentType: { type: String, required: false }
    },
    // Array of authorization methods
    authorizations: [ Authorization ]
});

///////////////////////////////////////////////////////////////////////////////
// toObject                                                                  //
///////////////////////////////////////////////////////////////////////////////

Digestor.set('toObject', { getters: true, virtuals: false });

if (!Digestor.options.toObject) {
    Digestor.options.toObject = {};
}
Digestor.options.toObject.transform = function (document, ret, options) {
    'use strict';

    delete ret.__v;
    return ret;
};

///////////////////////////////////////////////////////////////////////////////
// toJSON                                                                    //
///////////////////////////////////////////////////////////////////////////////

Digestor.set('toJSON', { getters: true, virtuals: false });

if (!Digestor.options.toJSON) {
    Digestor.options.toJSON = {};
}
Digestor.options.toJSON.transform = function (document, ret, options) {
    'use strict';

    delete ret.__v;
    return ret;
};

///////////////////////////////////////////////////////////////////////////////
// Validators                                                                //
///////////////////////////////////////////////////////////////////////////////
function colorValidator (color) {
    'use strict';

    if (color.indexOf('#') == 0) {
        if (color.length == 7) {  // #f0f0f0
            return true;
        } else if (color.length == 4) {  // #fff
            return true;
        }
    }
    return COLORS.indexOf(color) > -1;
};
module.exports = mongoose.model('Digestor', Digestor);
