///////////////////////////////////////////////////////////////////////////////
// @file         : digestor.js                                               //
// @summary      : Digestor schema                                           //
// @version      : 0.1                                                       //
// @project      : mia.pi                                                    //
// @description  :                                                           //
// @author       : Benjamin Maggi                                            //
// @email        : benjaminmaggi@gmail.com                                   //
// @date         : 6 Oct 2013                                                //
// ------------------------------------------------------------------------- //
//                                                                           //
// @copyright Copyright 2013 Benjamin Maggi, all rights reserved.            //
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

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

// Load Account model
var account_schema = require('../models/account')
  , Account = mongoose.model('Account', account_schema);

var Authorizations = new Schema({
});
var Responses = new Schema({
    code: {type: Number, required: false},
    message: { type: String, required: false }
});
var Parameters = new Schema({
    name: { type: String, required: true, trim: true },
    required: { type: Boolean, default: true, required: false },
    synopsis: { type: String, required: false },
    default: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true }
});
var Proxy = new Schema({
    URI:  { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: false, required: false }
});
var Methods = new Schema({
    name: { type: String, required: true, trim: true },
    nickname: { type: String, required: false, trim: true },
    synopsis: { type: String, required: false },
    URI: { type: String, required: true, trim: true },
    consumes: { type: String, required: false },
    produces: { type: String, required: false },
    method: { type: String, required: true, trim: true },
    proxy: [Proxy],
    parameters: [Parameters],
    responses: [Responses],
    authorizations: [Authorizations]
});
var Endpoints = new Schema({
    name: { type: String, required: true, trim: true },
    synopsis: { type: String, required: false },
    methods: [Methods]
});
var Digestor = new Schema({
    name: { type: String, required: true, trim: true },
    type: { type: String, required: false, default: "REST" },
    version: {type: String, required: false},
    domain: {type: String, required: false},
    protocol: { type: String, required: false, default: "http" },
    baseURL: {type: String, required: false},
    allowCrossDomain: {type: Boolean, default: false, required: false},
    logging: {type: Boolean, default: false, required: false},
    created: { type: Date, default: Date.now },
    lastUpdate: { type: Date, default: Date.now },
    lastAccess: { type: Date, default: Date.now },
    enabled: { type: Boolean, default: true, required: false },
    endpoints: [Endpoints],
    hits: {type: Number, default: 0, required: false},
    owners: [{ type: Schema.Types.ObjectId, ref: 'Account' }]
});

module.exports = mongoose.model('Digestor', Digestor);