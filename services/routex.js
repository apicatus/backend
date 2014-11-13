///////////////////////////////////////////////////////////////////////////////
// @file         : routex.js                                                 //
// @summary      : Url pattern matching                                      //
// @version      : 0.1                                                       //
// @project      : apicat.us                                                 //
// @description  :                                                           //
// @author       : Benjamin Maggi                                            //
// @email        : benjaminmaggi@gmail.com                                   //
// @date         : 12 Nov 2014                                               //
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

// Original idea: 'url-pattern' <kruemaxi@gmail.com> https://github.com/snd/url-pattern

module.exports = {
    PatternPrototype: {
        match: function(url) {
            'use strict';

            var bound, captured, i, match, name, value, _i, _len;
            match = this.regex.exec(url);
            if (match == null) {
                return null;
            }
            captured = match.slice(1);
            if (this.isRegex) {
                return captured;
            }
            bound = {};
            for (i = _i = 0, _len = captured.length; _i < _len; i = ++_i) {
                value = captured[i];
                name = this.names[i];
                if (value == null) {
                    continue;
                }
                if (name === '_') {
                    if (bound._ == null) {
                        bound._ = [];
                    }
                    bound._.push(value);
                } else {
                    bound[name] = value;
                }
            }
            return bound;
        }
    },
    newPattern: function(arg, separator) {
        'use strict';

        var isRegex, pattern, regexString;
        if (separator == null) {
            separator = '/';
        }
        isRegex = arg instanceof RegExp;
        if (!(('string' === typeof arg) || isRegex)) {
            throw new TypeError('argument must be a regex or a string');
        }
        [':', '*'].forEach(function(forbidden) {
            if (separator === forbidden) {
                throw new Error("separator can't be " + forbidden);
            }
        });
        pattern = Object.create(module.exports.PatternPrototype);
        pattern.isRegex = isRegex;
        pattern.regex = isRegex ? arg : (regexString = module.exports.toRegexString(arg, separator), new RegExp(regexString));
        if (!isRegex) {
            pattern.names = module.exports.getNames(arg, separator);
        }
        return pattern;
    },
    escapeForRegex: function(string) {
        'use strict';

        return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    },
    getNames: function(arg, separator) {
        'use strict';

        var escapedSeparator, name, names, regex, results;
        if (separator == null) {
            separator = '/';
        }
        if (arg instanceof RegExp) {
            return [];
        }
        escapedSeparator = module.exports.escapeForRegex(separator);
        regex = new RegExp("((:?:[^" + escapedSeparator + "\(\)]+)|(?:[\*]))", 'g');
        names = [];
        results = regex.exec(arg);
        while (results != null) {
            name = results[1].slice(1);
            if (name === '_') {
                throw new TypeError(":_ can't be used as a pattern name in pattern " + arg);
            }
            if (names.indexOf(name) >= 0) {
                throw new TypeError("duplicate pattern name :" + name + " in pattern " + arg);
            }
            names.push(name || '_');
            results = regex.exec(arg);
        }
        return names;
    },
    escapeSeparators: function(string, separator) {
        'use strict';

        var escapedSeparator, regex;
        if (separator == null) {
            separator = '/';
        }
        escapedSeparator = module.exports.escapeForRegex(separator);
        regex = new RegExp(escapedSeparator, 'g');
        return string.replace(regex, escapedSeparator);
    },
    toRegexString: function(string, separator) {
        'use strict';

        var escapedSeparator, stringWithEscapedSeparators;
        if (separator == null) {
            separator = '/';
        }
        stringWithEscapedSeparators = module.exports.escapeSeparators(string, separator);
        stringWithEscapedSeparators = stringWithEscapedSeparators.replace(/\((.*?)\)/g, '(?:$1)?').replace(/\*/g, '(.*?)');
        escapedSeparator = module.exports.escapeForRegex(separator);
        module.exports.getNames(string, separator).forEach(function(name) {
            return stringWithEscapedSeparators = stringWithEscapedSeparators.replace(':' + name, "([^\\" + separator + "]+)");
        });
        return "^" + stringWithEscapedSeparators + "$";
    }
};