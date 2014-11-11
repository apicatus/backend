///////////////////////////////////////////////////////////////////////////////
// @file         : device.js                                                 //
// @summary      : HTTP Request Device Parser                                //
// @version      : 0.1                                                       //
// @project      : Apicatus                                                  //
// @description  :                                                           //
// @author       : Benjamin Maggi                                            //
// @email        : benjaminmaggi@gmail.com                                   //
// @date         : 10 Nov 2014                                               //
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

var conf = require('../config'),
    extend = require('util')._extend;

var defaultOptions = {
    emptyUserAgentDeviceType: 'desktop',
    unknownUserAgentDeviceType: 'phone',
    botUserAgentDeviceType: 'bot'
};

///////////////////////////////////////////////////////////////////////////////
// Device parser Class                                                       //
//                                                                           //
// @param {Object} response                                                  //
// @param {Object} options (optional)                                        //
// @return {Object} String Device Type                                       //
//                                                                           //
// @api private                                                              //
//                                                                           //
///////////////////////////////////////////////////////////////////////////////
function DeviceParser(request, options) {
    var self = this;

    self.options = extend(defaultOptions, options);

    self.user_agent = function () {
        return request.headers['user-agent'];
    };

    self.get_type = function () {
        var ua = self.user_agent();

        if (!ua || ua === '') {
            if (request.headers['cloudfront-is-mobile-viewer'] === 'true') return 'phone';
            if (request.headers['cloudfront-is-tablet-viewer'] === 'true') return 'tablet';
            if (request.headers['cloudfront-is-desktop-viewer'] === 'true') return 'desktop';
            // No user agent.
            return self.options.emptyUserAgentDeviceType;
        }

        if (ua.match(/GoogleTV|SmartTV|Internet TV|NetCast|NETTV|AppleTV|boxee|Kylo|Roku|DLNADOC|CE\-HTML/i)) {
            // if user agent is a smart TV - http://goo.gl/FocDk
            return 'tv';
        } else if (ua.match(/Xbox|PLAYSTATION 3|Wii/i)) {
            // if user agent is a TV Based Gaming Console
            return 'tv';
        } else if (ua.match(/iP(a|ro)d/i) || (ua.match(/tablet/i) && !ua.match(/RX-34/i)) || ua.match(/FOLIO/i)) {
            // if user agent is a Tablet
            return 'tablet';
        } else if (ua.match(/Linux/i) && ua.match(/Android/i) && !ua.match(/Fennec|mobi|HTC Magic|HTCX06HT|Nexus One|SC-02B|fone 945/i)) {
            // if user agent is an Android Tablet
            return 'tablet';
        } else if (ua.match(/Kindle/i) || (ua.match(/Mac OS/i) && ua.match(/Silk/i)) || (ua.match(/AppleWebKit/i) && ua.match(/Silk/i) && !ua.match(/Playstation Vita/i))) {
            // if user agent is a Kindle or Kindle Fire
            return 'tablet';
        } else if (ua.match(/GT-P10|SC-01C|SHW-M180S|SGH-T849|SCH-I800|SHW-M180L|SPH-P100|SGH-I987|zt180|HTC( Flyer|_Flyer)|Sprint ATP51|ViewPad7|pandigital(sprnova|nova)|Ideos S7|Dell Streak 7|Advent Vega|A101IT|A70BHT|MID7015|Next2|nook/i) || (ua.match(/MB511/i) && ua.match(/RUTEM/i))) {
            // if user agent is a pre Android 3.0 Tablet
            return 'tablet';
        } else if (ua.match(/BOLT|Fennec|Iris|Maemo|Minimo|Mobi|mowser|NetFront|Novarra|Prism|RX-34|Skyfire|Tear|XV6875|XV6975|Google Wireless Transcoder/i)) {
            // if user agent is unique phone User Agent
            return 'phone';
        } else if (ua.match(/Opera/i) && ua.match(/Windows NT 5/i) && ua.match(/HTC|Xda|Mini|Vario|SAMSUNG\-GT\-i8000|SAMSUNG\-SGH\-i9/i)) {
            // if user agent is an odd Opera User Agent - http://goo.gl/nK90K
            return 'phone';
        } else if ((ua.match(/Windows (NT|XP|ME|9)/) && !ua.match(/Phone/i)) && !ua.match(/Bot|Spider|ia_archiver|NewsGator/i) || ua.match(/Win( ?9|NT)/i)) {
            // if user agent is Windows Desktop
            return 'desktop';
        } else if (ua.match(/Macintosh|PowerPC/i) && !ua.match(/Silk/i)) {
            // if agent is Mac Desktop
            return 'desktop';
        } else if (ua.match(/Linux/i) && ua.match(/X11/i) && !ua.match(/Charlotte/i)) {
            // if user agent is a Linux Desktop
            return 'desktop';
        } else if (ua.match(/CrOS/)) {
            // if user agent is a Chrome Book
            return 'desktop';
        } else if (ua.match(/Solaris|SunOS|BSD/i)) {
            // if user agent is a Solaris, SunOS, BSD Desktop
            return 'desktop';
        } else if (ua.match(/curl|Bot|B-O-T|Crawler|Spider|Spyder|Yahoo|ia_archiver|Covario-IDS|findlinks|DataparkSearch|larbin|Mediapartners-Google|NG-Search|Snappy|Teoma|Jeeves|Charlotte|NewsGator|TinEye|Cerberian|SearchSight|Zao|Scrubby|Qseero|PycURL|Pompos|oegp|SBIder|yoogliFetchAgent|yacy|webcollage|VYU2|voyager|updated|truwoGPS|StackRambler|Sqworm|silk|semanticdiscovery|ScoutJet|Nymesis|NetResearchServer|MVAClient|mogimogi|Mnogosearch|Arachmo|Accoona|holmes|htdig|ichiro|webis|LinkWalker|lwp-trivial|facebookexternalhit/i) && !ua.match(/phone|Playstation/i)) {
            // if user agent is a BOT/Crawler/Spider
            return self.options.botUserAgentDeviceType;
        } else {
            // Otherwise assume it is a phone Device
            return self.options.unknownUserAgentDeviceType;
        }
    };
}

///////////////////////////////////////////////////////////////////////////////
// Parse User Agent                                                          //
//                                                                           //
// @param {Object} response                                                  //
// @return {Object} String Device Type                                       //
//                                                                           //
// @api exports                                                              //
//                                                                           //
///////////////////////////////////////////////////////////////////////////////
exports.parse = function(request, options) {
    var parser = new DeviceParser(request, options);
    return parser.get_type();
};

exports.capture = function (options) {
    return function (request, response, next) {
        var parser = new DeviceParser(request, options);
        request.device = request.device || {};

        request.device.type = parser.get_type();

        if (next) return next();
    };
};