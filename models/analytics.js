///////////////////////////////////////////////////////////////////////////////
// @file         : analytics.js                                              //
// @summary      : Api Analytics Schema                                      //
// @version      : 0.1                                                       //
// @project      : apicat.us                                                 //
// @description  :                                                           //
// @author       : Benjamin Maggi                                            //
// @email        : benjaminmaggi@gmail.com                                   //
// @date         : 12 Mar 2014                                               //
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

var Analytics = new Schema({


	messageCount: { type: Number, required: false, default 0 },
	errorCount: { type: Number, required: false, default 0 },
	maxResponseTime: { type: Number, required: false, default 0 },
	minResponseTime: { type: Number, required: false, default 0 },
	dataExchangeSize: { type: Number, required: false, default 0 },
	endPointResponseTime: { type: Number, required: false, default 0 },
	transactions: { type: Number, required: false, default 0 },

	/*
    ip: { type: String, required: true, trim: true },
    query: {type: Object}, // REPLACE WITH URL
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
    */
});

module.exports = mongoose.model('Analytics', Analytics);

/*
message_count	Total number of request messages received by all API proxies	message_count
error_count	Total number of all error messages (request, response) across all API proxies	message_count
app_count	Total number of all apps provisioned	message_count
api_count	Total number of API proxies	message_count
total_response_time	Total traffic across all API proxies in an environment	message_count
max_response_time	The highest value, in milliseconds, for a complete roundtrip transaction on Apigee Edge, including network latency and processing time by the backend (target) service	message_count
min_response_time	The smallest value, in milliseconds, for a complete roundtrip transaction on Apigee Edge, including network latency and processing time by the backend (target) service	message_count
data_exchange_size	The size, in kilobytes, of the inbound request message plus the size, in kilobytes, of the outbound response message	message_count
end_point_response_time	The time, in milliseconds, between the TargetEndpoint response is sent and the request is received by the TargetEndpoint	message_count
tps	Number of transactions per second. If tps is specified, the timeUnit query parameter must be greater than one second. 	message_count
tpm	Number of transactions per minute. If tpm is specified, the timeUnit query parameter must be greater than one minute. 	message_count
tph	Number of transactions per hour. If tph is specified, the timeUnit query parameter must be greater than one hour. 	message_count
*/