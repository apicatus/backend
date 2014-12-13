///////////////////////////////////////////////////////////////////////////////
// @file         : asserts.js                                                //
// @summary      : API Method assertion                                      //
// @version      : 0.1                                                       //
// @project      : Apicatus                                                  //
// @description  : Executes assertions on method properties                  //
// @author       : Benjamin Maggi                                            //
// @email        : benjaminmaggi@gmail.com                                   //
// @date         : 04 Dec 2014                                               //
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

var should = require('should');

///////////////////////////////////////////////////////////////////////////////
// Parse User Agent                                                          //
//                                                                           //
// @param {Object} response                                                  //
// @return {Object} String Device Type                                       //
//                                                                           //
// @api exports                                                              //
//                                                                           //
///////////////////////////////////////////////////////////////////////////////
exports.assert = function(assertions, response, request, next) {
    'use strict';

    var resolve = function(path, obj) {
        return [obj || self].concat(path.split('.')).reduce(function(prev, curr) {
            return prev[curr];
        });
    }
    var errors = [];
    assertions.forEach(function(assert){

        var source = sources.filter(function(source){
            return source.id === assert.source;
        })[0];

        var result = null;
        var value = null;

        try {
            if(assert.source.needsProperty && assert.property) {

                value = resolve(assert.property, origin[assert.source.origin]);

            } else if (!assert.source.needsProperty) {

                value = origin[assert.source.origin];

            } else {

                throw new Error('missing property');

            }

            if(assert.assertion.needsValue && assert.value) {

                if(!isNaN(assert.value)) {
                    assert.value = parseFloat(assert.value, 10);
                }

                result = assert.assertion.assert.split('.').reduce(function(prev, curr){
                    if(typeof prev[curr] == 'function') {
                        return prev[curr](assert.value);
                    } else {
                        var a = new Object(prev[curr]);
                        return prev[curr];
                    }
                }, Should(value));

            } else if (!assert.assertion.needsValue) {

                result = resolve(assert.assertion.assert, Should(value));

            } else {

                throw new Error('missing value');
            }

        } catch (error) {
            errors.push(error);
            //console.log("has error: ", error.message);
        } finally {
            //console.log(result);
        }
    });

    console.log(errors);
    return errors;

    var parser = new DeviceParser(request, options);
    return parser.get_type();
};
