///////////////////////////////////////////////////////////////////////////////
// @file         : analytics.js                                              //
// @summary      : Api Analytics Schema                                      //
// @version      : 0.1                                                       //
// @project      : apicat.us                                                 //
// @description  :                                                           //
// @author       : Benjamin Maggi                                            //
// @email        : benjaminmaggi@gmail.com                                   //
// @date         : 12 Mar 2014                                               //
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

var Analytics = new Schema({


    messageCount: { type: Number, required: false, default: 0 },
    errorCount: { type: Number, required: false, default: 0 },
    maxResponseTime: { type: Number, required: false, default: 0 },
    minResponseTime: { type: Number, required: false, default: 0 },
    dataExchangeSize: { type: Number, required: false, default: 0 },
    endPointResponseTime: { type: Number, required: false, default: 0 },
    transactions: { type: Number, required: false, default: 0 },
    digestor: { type: Schema.Types.ObjectId, ref: 'Methods' }
});

module.exports = mongoose.model('Analytics', Analytics);

/*
message_count   Total number of request messages received by all API proxies    message_count
error_count Total number of all error messages (request, response) across all API proxies   message_count
app_count   Total number of all apps provisioned    message_count
api_count   Total number of API proxies message_count
total_response_time Total traffic across all API proxies in an environment  message_count
max_response_time   The highest value, in milliseconds, for a complete roundtrip transaction on Apigee Edge, including network latency and processing time by the backend (target) service  message_count
min_response_time   The smallest value, in milliseconds, for a complete roundtrip transaction on Apigee Edge, including network latency and processing time by the backend (target) service message_count
data_exchange_size  The size, in kilobytes, of the inbound request message plus the size, in kilobytes, of the outbound response message    message_count
end_point_response_time The time, in milliseconds, between the TargetEndpoint response is sent and the request is received by the TargetEndpoint    message_count
tps Number of transactions per second. If tps is specified, the timeUnit query parameter must be greater than one second.   message_count
tpm Number of transactions per minute. If tpm is specified, the timeUnit query parameter must be greater than one minute.   message_count
tph Number of transactions per hour. If tph is specified, the timeUnit query parameter must be greater than one hour.   message_count
*/
