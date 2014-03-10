///////////////////////////////////////////////////////////////////////////////
// @file         : logger.js                                                 //
// @summary      : Logger schema                                             //
// @version      : 0.1                                                       //
// @project      : apicat.us                                                 //
// @description  :                                                           //
// @author       : Benjamin Maggi                                            //
// @email        : benjaminmaggi@gmail.com                                   //
// @date         : 2 Mar 2014                                                //
// ------------------------------------------------------------------------- //
//                                                                           //
// @copyright Copyright 2013~2014 Benjamin Maggi, all rights reserved.       //
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

var Logs = new Schema({
    ip: { type: String, required: true, trim: true },
    query: {type: Object},
    requestHeaders: {type: Object},
    requestBody: {type: Object},
    responseHeaders: {type: Object},
    responseBody: {type: Object},
    data: {type: Buffer, required: false},
    responseStatus: {type: Number, default: 0, required: true},
    status: {type: Number, default: 0, required: true},
    date: { type: Date, default: Date.now },
    time: {type: Number, default: 0, required: true},
    method: { type: Schema.Types.ObjectId, ref: 'Methods' },
    digestor: { type: Schema.Types.ObjectId, ref: 'Methods' }
});

module.exports = mongoose.model('Logs', Logs);
