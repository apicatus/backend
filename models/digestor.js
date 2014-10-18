///////////////////////////////////////////////////////////////////////////////
// @file         : digestor.js                                               //
// @summary      : Digestor schema                                           //
// @version      : 0.1                                                       //
// @project      : apicat.us                                                 //
// @description  :                                                           //
// @author       : Benjamin Maggi                                            //
// @email        : benjaminmaggi@gmail.com                                   //
// @date         : 6 Oct 2013                                                //
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

var Authorizations = new Schema({
});
/*var Responses = new Schema({
    code: {type: Number, required: false},
    message: { type: String, required: false }
});*/
var Parameters = new Schema({
    name: { type: String, required: true, trim: true },
    required: { type: Boolean, default: true, required: false },
    synopsis: { type: String, required: false },
    default: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true }
});
var Methods = new Schema({
    name: { type: String, required: true, trim: true },
    nickname: { type: String, required: false, trim: true },
    synopsis: { type: String, required: false },
    URI: { type: String, required: true, trim: true },
    consumes: { type: String, required: false },
    method: { type: String, required: true, trim: true },
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
        contentType: { type: String, required: false }
    },
    authorizations: [Authorizations]
});
var Endpoints = new Schema({
    name: { type: String, required: false, default: "Endpoint name", trim: true },
    synopsis: { type: String, required: false },
    methods: [ Methods ]
});
var Digestor = new Schema({
    name: { type: String, required: true, trim: true },
    synopsis: { type: String, required: false, default: "API description", trim: false },
    type: { type: String, required: false, default: "REST" },
    version: { type: String, required: false },
    subdomain: { type: String, required: false, trim: false, lowercase: true },
    protocol: { type: String, required: false, default: "http" },
    baseURL: { type: String, required: false },
    allowCrossDomain: { type: Boolean, default: false, required: false },
    logging: { type: Boolean, default: false, required: false },
    created: { type: Date, default: Date.now },
    lastUpdate: { type: Date, default: Date.now },
    lastAccess: { type: Date, default: Date.now },
    enabled: { type: Boolean, default: true, required: false },
    public: { type: Boolean, default: true, required: false },
    endpoints: [ Endpoints ],
    hits: { type: Number, default: 0, required: false },
    owners: [{ type: Schema.Types.ObjectId, ref: 'Account' }]
});

///////////////////////////////////////////////////////////////////////////////
// toObject                                                                  //
///////////////////////////////////////////////////////////////////////////////

Digestor.set('toObject', { getters: true, virtuals: false });

if (!Digestor.options.toObject) {
    Digestor.options.toObject = {};
}
Digestor.options.toObject.transform = function (document, ret, options) {
    delete ret._id;
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
    delete ret.__v;
    return ret;
};

module.exports = mongoose.model('Digestor', Digestor);
