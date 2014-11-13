///////////////////////////////////////////////////////////////////////////////
// @file         : logger.js                                                 //
// @summary      : Logger controller                                         //
// @version      : 0.1                                                       //
// @project      : apicat.us                                                 //
// @description  :                                                           //
// @author       : Benjamin Maggi                                            //
// @email        : benjaminmaggi@gmail.com                                   //
// @date         : 5 Mar 2014                                                //
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

// Controllers
var mongoose = require('mongoose'),
    url = require('url'),
    geoip = require('geoip-lite'),
    uap = require('ua-parser'),
    device = require('../services/device'),
    elasticsearch = require('elasticsearch');

// Load model
var digestor_schema = require('../models/digestor'),
    Digestor = mongoose.model('Digestor', digestor_schema);

var logs_mapping = require('../models/logs.mapping.json');
var client = new elasticsearch.Client();

///////////////////////////////////////////////////////////////////////////////
// Route to get all Digestors                                                //
//                                                                           //
// @param {Object} request                                                   //
// @param {Object} response                                                  //
// @param {Object} next                                                      //
// @return {Object} JSON Collection of Digestors                             //
//                                                                           //
// @api public                                                               //
//                                                                           //
// @url GET /logs/                                                           //
///////////////////////////////////////////////////////////////////////////////
exports.read = function (request, response, next) {
    'use strict';

    var defaults = {
        skip : 0,
        limit : 0,
        digestor: '',
        method: ''
    };
    var query = url.parse(request.url, true).query;
    var since, until;
    // Very crude ISO-8601 date pattern matching
    var isoDate = /^(\d{4})(?:-?W(\d+)(?:-?(\d+)D?)?|(?:-(\d+))?-(\d+))(?:[T ](\d+):(\d+)(?::(\d+)(?:\.(\d+))?)?)?(?:Z(-?\d*))?$/;

    if(query.since && query.until) {
        since = query.since.match(isoDate) ? query.since : parseInt(query.since, 10);
        until = query.until.match(isoDate) ? query.until : parseInt(query.until, 10);
    } else {
        // If empty then select the last 24hs
        until = new Date();
        since = new Date().setHours(new Date().getHours() - 6);
    }

    client.search({
        index: 'logs',
        size: query.limit || 10,
        from: query.from || 0,
        body: {
            //_source: [ 'date', 'ip', 'uri', 'status', 'time' ],
            query: {
                filtered: {
                    query: {
                        // Boolean query for matching and excluding items.
                        bool: {
                            should: [{
                                query_string: {
                                    query: "*"
                                }
                            }]
                        }
                    },
                    filter: {
                        bool: {
                            must: [{
                                range: {
                                    date: {
                                        from: since,
                                        to: until
                                    }
                                }
                            }],
                            should: [{
                                fquery: {
                                    query: {
                                        query_string: {
                                            query: "digestor:(" + query.digestor + ")"
                                        }
                                    }
                                }
                            }, 
                            {
                                fquery: {
                                    query: {
                                        query_string: {
                                            query: "method:(" + query.method + ")"
                                        }
                                    }
                                }
                            }]
                        }
                    }
                },
            },
            sort: [
                {
                    date: {
                        order: "desc", ignore_unmapped: true
                    }
                }
            ]
        }
    }).then(function (logs) {
        if(!logs.hits.hits.length) {
            response.statusCode = 404;
            return response.json({"title": "error", "message": "Not Found", "status": "fail"});
        }
        return response.json(logs.hits);
    }, function (error, body, code) {
        console.trace("error: ", error.message);
        if (error) throw new Error(error);
        response.statusCode = 500;
        return next(error);
    });
};

///////////////////////////////////////////////////////////////////////////////
// Create a log and store it to elasticsearch                                //
//                                                                           //
// @param {Object} request                                                   //
// @param {Object} response                                                  //
// @param {Object} next                                                      //
// @return {Object} JSON result                                              //
//                                                                           //
// @api public                                                               //
//                                                                           //
// @url POST /logs                                                           //
///////////////////////////////////////////////////////////////////////////////
exports.create = function(request, response, next) {
    'use strict';

    var testIps = ["103.7.104.10", "80.78.64.10", "154.66.96.12", "185.4.52.21", "196.1.15.21", "204.14.248.21", "204.16.112.21", "179.0.131.21", "201.229.64.12", "27.113.240.10", "202.36.91.12", "103.243.18.12", "194.50.35.12", "209.195.192.12", "196.223.26.12", "185.11.8.11", "146.226.0.11", "162.210.68.11", "103.245.248.3", "161.196.0.11", "103.25.228.1", "185.4.160.12", "190.108.0.12", "100.42.128.12", "217.169.32.12", "77.104.64.11", "202.152.32.4", "221.199.224.11"];
    var testUas = ["Mozilla/5.0 (Windows; U; Windows NT 5.1; de-CH) AppleWebKit/523.15 (KHTML, like Gecko, Safari/419.3) Arora/0.2", "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 5.1; Trident/4.0; GTB5; Avant Browser; .NET CLR 1.1.4322; .NET CLR 2.0.50727)", "Mozilla/5.0 (Macintosh; U; PPC Mac OS X 10.4; en; rv:1.9.0.19) Gecko/2011091218 Camino/2.0.9 (like Firefox/3.0.19)", "Mozilla/5.0 (Windows NT 6.2) AppleWebKit/536.6 (KHTML, like Gecko) Chrome/20.0.1090.0 Safari/536.6", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_3) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11", "Mozilla/5.0 (Windows NT 6.0) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.75 Safari/537.1", "Mozilla/5.0 (X11; U; Linux i686; en-US) AppleWebKit/534.16 (KHTML, like Gecko) Chrome/10.0.648.127 Safari/534.16", "Mozilla/5.0 (iPhone; U; CPU iPhone OS 5_1_1 like Mac OS X; en) AppleWebKit/534.46.0 (KHTML, like Gecko) CriOS/19.0.1084.60 Mobile/9B206 Safari/7534.48.3", "Mozilla/5.0 (Linux; U; Android-4.0.3; en-us; Galaxy Nexus Build/IML74K) AppleWebKit/535.7 (KHTML, like Gecko) CrMo/16.0.912.75 Mobile Safari/535.7", "Mozilla/5.0 (X11; U; CrOS i686 9.10.0; en-US) AppleWebKit/532.5 (KHTML, like Gecko) Chrome/4.0.253.0 Safari/532.5", "Mozilla/5.0 (X11; Linux i686) AppleWebKit/535.7 (KHTML, like Gecko) Ubuntu/11.10 Chromium/16.0.912.21 Chrome/16.0.912.21 Safari/535.7", "Dillo/2.2", "Mozilla/5.0 (Linux; U; Android 2.3.5; en-gb; HTC Desire HD A9191 Build/GRJ90) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1", "Mozilla/5.0 (X11; U; FreeBSD i386; en-US; rv:1.7) Gecko/20040628 Epiphany/1.2.6", "Mozilla/5.0 (Windows NT 6.1; rv:15.0) Gecko/20120716 Firefox/15.0a2", "Mozilla/5.0 (Windows NT 5.1; rv:2.0) Gecko/20100101 Firefox/4.0", "Mozilla/5.0 (Macintosh; U; PPC Mac OS X 10.5; en-US; rv:1.9.0.3) Gecko/2008092414 Firefox/3.0.3", "Mozilla/5.0 (X11; U; OpenBSD i386; en-US; rv:1.8.1.14) Gecko/20080821 Firefox/2.0.0.14", "Mozilla/5.0 (X11; U; SunOS sun4u; en-US; rv:1.9b5) Gecko/2008032620 Firefox/3.0b5", "Mozilla/5.0 (X11; U; Linux armv61; en-US; rv:1.9.1b2pre) Gecko/20081015 Fennec/1.0a1", "Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.0.3) Gecko/2008100716 Firefox/3.0.3 Flock/2.0", "Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.1.19) Gecko/20110817 Iceape/2.0.14", "Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.0.3) Gecko/2008092921 IceCat/3.0.3-g1", "Mozilla/5.0 (X11; U; Linux i686; de; rv:1.9.0.16) Gecko/2009121610 Iceweasel/3.0.6 (Debian-3.0.6-3)", "iCab/2.9.5 (Macintosh; U; PPC; Mac OS X)", "Mozilla/4.0 (compatible; MSIE 6.0; Windows CE; IEMobile 7.11) 320x240; VZW; Motorola-Q9c; Windows Mobile 6.1 Standard", "Mozilla/5.0 (Windows; U; Win98; en-US; rv:1.5) Gecko/20031016 K-Meleon/0.8.2", "Mozilla/5.0 (compatible; Konqueror/3.5; Linux; X11; x86_64) KHTML/3.5.6 (like Gecko) (Kubuntu)", "Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.9.1.2) Gecko/20090804 Firefox/3.5.2 Lunascape/5.1.4.5", "Lynx/2.8.5dev.16 libwww-FM/2.14 SSL-MM/1.4.1 OpenSSL/0.9.6b", "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1; SV1; Maxthon; .NET CLR 1.1.4322)", "Midori/0.2.2 (X11; Linux i686; U; en-us) WebKit/531.2+", "Mozilla/5.0 (X11; U; Linux armv6l; rv 1.8.1.5pre) Gecko/20070619 Minimo/0.020", "Mozilla/5.0 (Windows; U; Windows CE 5.1; rv:1.8.1a3) Gecko/20060610 Minimo/0.016", "Mozilla/5.0 (X11; U; SunOS sun4u; en-US; rv:1.7) Gecko/20070606", "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)", "Mozilla/4.0 (compatible; MSIE 5.0b1; Mac_PowerPC)", "Mozilla/4.0 (PDA; Windows CE/1.0.1) NetFront/3.0", "Mozilla/5.0 (Windows; U; Windows NT 5.0; en-US; rv:1.7.5) Gecko/20050519 Netscape/8.0.1", "Mozilla/5.0 (Windows; U; Win98; en-US; rv:1.7.5) Gecko/20050603 Netscape/8.0.2", "Mozilla/5.0 (Windows; U; Win95; de-DE; rv:0.9.2) Gecko/20010726 Netscape6/6.1", "Mozilla/5.0 (Windows; U; Win 9x 4.90; en-US; rv:1.8.1.8pre) Gecko/20071015 Firefox/2.0.0.7 Navigator/9.0", "Mozilla/5.0 (Macintosh; U; PPC Mac OS X Mach-O; en-US; rv:1.4) Gecko/20030624 Netscape/7.1", "Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.0.2) Gecko/20021120 Netscape/7.01", "Mozilla/5.0 (Windows; U; WinNT4.0; de-DE; rv:0.9.4) Gecko/20011128 Netscape6/6.2.1", "Mozilla/5.0 (X11; U; SunOS sun4u; en-US; rv:0.9.2) Gecko/20011002 Netscape6/6.1", "Mozilla/5.0 (X11; U; HP-UX 9000/785; es-ES; rv:1.0.1) Gecko/20020827 Netscape/7.0", "Mozilla/5.0 (X11; U; AIX 0048013C4C00; en-US; rv:1.0.1) Gecko/20021009 Netscape/7.0", "Mozilla/5.0 (Macintosh; U; PPC Mac OS X; en-US) AppleWebKit/85 (KHTML, like Gecko) OmniWeb/v558.48", "Opera/9.80 (X11; Linux x86_64; U; Linux Mint; en) Presto/2.2.15 Version/10.10", "Mozilla/4.0 (compatible; MSIE 5.0; Windows 95) Opera 6.01 [en]", "Opera/8.5 (Macintosh; PPC Mac OS X; U; en)", "Opera/9.80 (Android 2.3.5; Linux; Opera Mobi/ADR-1111101157; U; de) Presto/2.9.201 Version/11.50", "Opera/9.80 (Windows Mobile; WCE; Opera Mobi/WMD-50433; U; en) Presto/2.4.13 Version/10.00", "Mozilla/4.0 (compatible; MSIE 6.0; Windows CE; PPC; 480x640) Opera 8.60 [en]", "Opera/9.80 (J2ME/MIDP; Opera Mini/5.1.21214/19.916; U; en) Presto/2.5.25", "Opera/9.80 (S60; SymbOS; Opera Mobi/499; U; ru) Presto/2.4.18 Version/10.00", "Mozilla/5.0 (Linux; Android 4.1.2; GT-N7000 Build/JZO54K) AppleWebKit/537.22 (KHTML, like Gecko) Chrome/25.0.1364.123 Mobile Safari/537.22 OPR/14.0.1025.52315", "LG-LX600 Polaris/6.0 MMP/2.0 Profile/MIDP-2.1 Configuration/CLDC-1.1", "Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US) AppleWebKit/534.7 (KHTML, like Gecko) RockMelt/0.8.36.78 Chrome/7.0.517.44 Safari/534.7", "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_6; en-us) AppleWebKit/533.20.25 (KHTML, like Gecko) Version/5.0.4 Safari/533.20.27", "Mozilla/5.0 (iPhone; U; CPU iPhone OS 2_1 like Mac OS X; en-us) AppleWebKit/525.18.1 (KHTML, like Gecko) Version/3.1.1 Mobile/5F136 Safari/525.20", "Mozilla/5.0 (iPod; U; CPU iPhone OS 2_0 like Mac OS X; de-de) AppleWebKit/525.18.1 (KHTML, like Gecko) Version/3.1.1 Mobile/5A347 Safari/525.20", "Mozilla/5.0 (Windows; U; Windows NT 5.1; ru) AppleWebKit/522.11.3 (KHTML, like Gecko) Version/3.0 Safari/522.11.3", "Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.1b4pre) Gecko/20090405 SeaMonkey/2.0b1pre", "Mozilla/5.0 (Linux; U; Android 2.3.4; en-us; Silk/1.0.13.328_10008910) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1 Silk-Accelerated=true", "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_5_7; en-us) AppleWebKit/530.17 (KHTML, like Gecko) Version/4.0 Safari/530.17 Skyfire/2.0", "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1; Trident/4.0; SlimBrowser)", "Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.8.1) Gecko/20061024 Firefox/2.0 (Swiftfox)", "Mozilla/5.0 (Linux; U; Android 2.3.4; en-US; MT11i Build/4.0.2.A.0.62) AppleWebKit/534.31 (KHTML, like Gecko) UCBrowser/9.0.1.275 U3/0.8.0 Mobile Safari/534.31", "Mozilla/5.0 (Linux; U; Tizen/1.0 like Android; en-us; AppleWebKit/534.46 (KHTML, like Gecko) Tizen Browser/1.0 Mobile", "Mozilla/5.0 (Linux; U; Android 3.2.1; en-gb; A501 Build/HTK55D) AppleWebKit/534.13 (KHTML, like Gecko) Version/4.0 Safari/534.13", "Mozilla/5.0 (Linux; U; Android 2.2.1; en-au; eeepc Build/MASTER) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1", "Mozilla/5.0 (iPhone; CPU iPhone OS 5_1 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9B176 Safari/7534.48.3", "Mozilla/5.0 (iPhone; CPU iPhone OS 5_0_1 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A405 Safari/7534.48.3", "Mozilla/5.0 (iPad; U; CPU OS 4_3 like Mac OS X; de-de) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8F191 Safari/6533.18.5", "BenQ-CF61/1.00/WAP2.0/MIDP2.0/CLDC1.0 UP.Browser/6.3.0.4.c.1.102 (GUI) MMP/2.0", "Mozilla/5.0 (PlayBook; U; RIM Tablet OS 2.0.1; en-US) AppleWebKit/535.8+ (KHTML, like Gecko) Version/7.2.0.1 Safari/535.8+", "Mozilla/5.0 (BlackBerry; U; BlackBerry 9700; en-US) AppleWebKit/534.8+ (KHTML, like Gecko) Version/6.0.0.448 Mobile Safari/534.8+", "BlackBerry8320/4.5.0.188 Profile/MIDP-2.0 Configuration/CLDC-1.1 VendorID/100", "Mozilla/4.0 (compatible; MSIE 7.0; Windows Phone OS 7.0; Trident/3.1; IEMobile/7.0; DELL; Venue Pro)", "Mozilla/5.0 (hp-tablet; Linux; hpwOS/3.0.2; U; en-US) AppleWebKit/534.6 (KHTML, like Gecko) wOSBrowser/234.40.1 Safari/534.6 TouchPad/1.0", "Mozilla/4.0 (compatible; MSIE 4.01; Windows CE; PPC; 240x320; HP iPAQ h6300)", "HTC_Touch_HD_T8282 Mozilla/4.0 (compatible; MSIE 6.0; Windows CE; IEMobile 7.11)", "Mozilla/4.0 (compatible: MSIE 7.0; Windows Phone OS 7.0; Trident/3.1; IEMobile/7.0; HTC; 7 Trophy)", "Modzilla/4.0 (compatible; MSIE 6.0; Windows CE; IEMobile 7.11) 480x640; XV6850; Window Mobile 6.1 Professional;", "Mozilla/4.0 (compatible; Linux 2.6.22) NetFront/3.4 Kindle/2.0 (screen 600x800)", "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_3; en-us; Silk/1.1.0-84) AppleWebKit/533.16 (KHTML, like Gecko) Version/5.0 Safari/533.16 Silk-Accelerated=true", "LG-GS290/V100 Obigo/WAP2.0 Profile/MIDP-2.1 Configuration/CLDC-1.1", "Mozilla/5.0 (Linux; U; Android 2.2.1; de-de; LG-P350 Build/FRG83) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1 MMS/LG-Android-MMS-V1.0/1.2", "LGE-CX5450 UP.Browser/6.2.2.3.d.1.103 (GUI) MMP/2.0", "POLARIS/6.01(BREW 3.1.5;U;en-us;LG;LX265;POLARIS/6.01/WAP;)MMP/2.0 profile/MIDP-201 Configuration /CLDC-1.1", "LG/KU990i/v10a Browser/Obigo-Q05A/3.6 MMS/LG-MMS-V1.0/1.2 Java/ASVM/1.0 Profile/MIDP-2.0 Configuration/CLDC-1.1", "Mozilla/5.0 (Linux; U; Android 2.2.1; fr-ca; Milestone Build/ SHOLS_U2_05.26.1) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1", "Mozilla/5.0 (Linux; U; Android 3.0.1; de-de; MZ601 Build/H.6.1-38-5) AppleWebKit/534.13 (KHTML, like Gecko) Version/4.0 Safari/534.13", "Mozilla/5.0 (Linux; U; Android 3.0.1; en-us; Xoom Build/HWI69) AppleWebKit/534.13 (KHTML, like Gecko) Version/4.0 Safari/534.13", "Mozilla/5.0 (Linux; U; Android 2.2; en-us; DROID2 Build/VZW) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1 480X854 motorola DROID2", "MOT-V9mm/00.62 UP.Browser/6.2.3.4.c.1.123 (GUI) MMP/2.0", "Mozilla/5.0 (Nintendo 3DS; U; ; en) Version/1.7498.EU", "Opera/9.30 (Nintendo Wii; U; ; 2047-7; en)", "Mozilla/5.0 (SymbianOS/9.4; U; Series60/5.0 Nokia5800d-1b/20.2.014; Profile/MIDP-2.1 Configuration/CLDC-1.1 ) AppleWebKit/413 (KHTML, like Gecko) Safari/413", "NokiaN70-1/5.0737.3.0.1 Series60/2.8 Profile/MIDP-2.0 Configuration/CLDC-1.1/UC Browser7.8.0.95/27/352", "Mozilla/5.0 (X11; U; Linux armv7l; en-GB; rv:1.9.2a1pre) Gecko/20090928 Firefox/3.5 Maemo Browser 1.4.1.22 RX-51 N900", "Mozilla/4.0 (compatible; MSIE 5.0; Series80/2.0 Nokia9500/4.51 Profile/MIDP-2.0 Configuration/CLDC-1.1)", "NokiaN-Gage/1.0 SymbianOS/6.1 Series60/1.2 Profile/MIDP-1.0 Configuration/CLDC-1.0", "Mozilla/5.0 (webOS/1.4.5; U; en-US) AppleWebKit/532.2 (KHTML, like Gecko) Version/1.0 Safari/532.2 Pre/1.0", "PalmCentro/v0001 Mozilla/4.0 (compatible; MSIE 6.0; Windows 98; PalmSource/Palm-D061; Blazer/4.5) 16;320x320", "Mozilla/4.76 [en] (PalmOS; U; WebPro/3.0; Palm-Arz1)", "Mozilla/5.0 (Linux; U; Android 4.0.3; nl-nl; GT-I9000 Build/IML74K) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30", "Mozilla/5.0 (Linux; U; Android 2.3.5; de-de; SAMSUNG GT-S5830/S5830BUKS2 Build/GINGERBREAD) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1", "Mozilla/5.0 (Linux; U; Android 4.0.2; en-us; Galaxy Nexus Build/ICL53F) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30", "Mozilla/5.0 (Linux; U; Android 3.0.1; de-de; GT-P7100 Build/HRI83) AppleWebKit/534.13 (KHTML, like Gecko) Version/4.0 MobileSafari/534.13", "Mozilla/5.0 (Linux; U; Android 2.2; en-us; SCH-I800 Build/FROYO) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1", "Mozilla/5.0 (Linux; U; Android 2.0.1; en-us; Droid Build/ESD56) AppleWebKit/530.17 (KHTML, like Gecko) Version/4.0 Mobile Safari/530.17", "samsung-gt-s5620/UC Browser7.9.0.102/69/352 UNTRUSTED/1.0", "Samsung-SPHM800 AU-MIC-M800/2.0 MMP/2.0 Profile/MIDP-2.0 Configuration/CLDC-1.1 UNTRUSTED/1.0", "TELECA-/2.0 (BREW 3.1.5; U; EN-US;SAMSUNG; SPH-M800; Teleca/Q05A/INT) MMP/2.0 Profile/MIDP-2.1 Configuration/CLDC-1.1", "SEC-SGHE900/1.0 NetFront/3.2 Profile/MIDP-2.0 Configuration/CLDC-1.1 Opera/8.01 (J2ME/MIDP; Opera Mini/2.0.4509/1378; nl; U; ssr)", "SIE-S65/12 UP.Browser/7.0.0.1.c3 (GUI) MMP/2.0 Profile/MIDP-2.0 Configuration/CLDC-1.1 UP.Link/5.1.2.16", "SonyEricssonK800i/R8BF Browser/NetFront/3.3 Profile/MIDP-2.0 Configuration/CLDC-1.1", "Opera/8.01 (J2ME/MIDP; Opera Mini/1.0.1479/HiFi; SonyEricsson P900; no; U; ssr)", "SonyEricssonP1i/R100 Mozilla 4.0 (compatibile; MSIE 6.0; Symbian OS;768) Opera 8.65 [hr]", "Mozilla/5.0 (Linux; U; Android 3.2; de-de; Sony Tablet P Build/THMD01900) AppleWebKit/534.13 (KHTML, like Gecko) Version/4.0 Safari/534.13", "Mozilla/5.0 (PLAYSTATION 3; 1.00)", "Mozilla/4.0 (PSP (PlayStation Portable); 2.00)", "Mozilla/5.0 (ZTE-E_N72/N72V1.0.0B02;U;Windows Mobile/6.1;Profile/MIDP-2.0 Configuration/CLDC-1.1;320*240;CTC/2.0) IE/6.0 (compatible; MSIE 4.01; Windows CE; PPC)/UC Browser7.7.1.88"];
    var testIp = testIps[Math.floor(Math.random() * testIps.length)];
    var testUa = testUas[Math.floor(Math.random() * testUas.length)];

    request.headers['user-agent'] = testUa;


    var ip = request.headers['x-forwarded-for'] ||
        request.connection.remoteAddress ||
        request.socket.remoteAddress ||
        request.connection.socket.remoteAddress;

    var log = {
        ip: ip,
        uri: url.parse(request.url, true, true),
        requestHeaders: request.headers,
        requestBody: request.body,
        responseHeaders: {},
        date: new Date(),
        status: 0,
        time: 0,
        data: {
            out: '',
            in: JSON.stringify(request.body)
        },
        geo: geoip.lookup(testIp),
        ua: uap.parse(request.headers['user-agent'])
    };    
    log.ua.device.type = device.parse(request);

    function logRequest() {

        log.time = new Date().getTime() - log.date.getTime();
        log.responseHeaders = response._headers;
        log.status = response.statusCode;
        if(response.getHeader('Transfer-Encoding')) {
            console.log('------->>CHUNKED<<------');
            console.log("ENC: ", response.getHeader('Transfer-Encoding'));
            console.log("SIZE: ", Buffer.byteLength(log.data.toString(), 'chunked'));
            console.log('------->>CHUNKED<<------');
        }
        // Save to elasticsearch
        client.create({
            index: 'logs',
            type: 'log',
            id: mongoose.Types.ObjectId().toString(),
            body: log
        }).then(function (response) {
            return response;
        }, function (error, body, code) {
            console.trace("error: ", error.message);
            if (error) throw new Error(error);
        });
    }
    
    response.on('finish', logRequest);
    response.on('data', function (chunk) {
        log.data.out = chunk;
    });
    response.on('end', function() {
    });
    response.on('header', function() {
    });
    return log;    
};


///////////////////////////////////////////////////////////////////////////////
// Route to update a Log                                                     //
//                                                                           //
// @param {Object} request                                                   //
// @param {Object} response                                                  //
// @param {Object} next                                                      //
// @return {Object} JSON updated document                                    //
//                                                                           //
// @api public                                                               //
//                                                                           //
// @url PUT /logs/:id                                                        //
///////////////////////////////////////////////////////////////////////////////
exports.update = function (request, response, next) {
    'use strict';

};

///////////////////////////////////////////////////////////////////////////////
// Route to remove Logs                                                      //
//                                                                           //
// @param {Object} request                                                   //
// @param {Object} response                                                  //
// @param {Object} next                                                      //
// @return {Object} JSON result                                              //
//                                                                           //
// @api public                                                               //
//                                                                           //
// @url DELETE /logs                                                         //
///////////////////////////////////////////////////////////////////////////////
exports.delete = function (request, response, next) {
    'use strict';

    var search = function() {
        var search = {
            "query": {
                "filtered" : { 
                    "filter": { 
                        "bool": {
                            "must": [],
                            "should": []
                        }
                    } 
                }
            }
        };
        if(request.params.entity && request.params.id) {
            search.query.filtered.filter.bool.must.push({
                "fquery": {
                    "query": {
                        "query_string": {
                            "query": request.params.entity + ":" + request.params.id
                        }
                    },
                    "_cache": true
                }
            });
        } else {
            request.user.digestors.forEach(function(digestor, index) {
                search.query.filtered.filter.bool.should.push({
                    "fquery": {
                        "query": {
                            "query_string": {
                                "query": "digestor:" + digestor
                            }
                        },
                        "_cache": true
                    }
                });
            });
        }
        return search;
    };

    ///////////////////////////////////////////////////////////////////////////
    // It we have an entity and param id make sure we own then befor remove  //
    ///////////////////////////////////////////////////////////////////////////
    if(request.params.entity && request.params.id) {

        Digestor.findOne({
            $and: [
                {
                    owners: {$in: [request.user._id]}
                }, {
                    $or: [
                        {'_id': request.params.id},                             // Digestors
                        {'endpoints._id': {$in: [request.params.id]}},          // Endpoints
                        {'endpoints.methods._id': {$in: [request.params.id]}}   // Methods
                    ]
                }
            ]
        })
        .exec(function(error, entity) {
            if (error) {
                response.statusCode = 500;
                return next(error);
            }
            if(!entity) {
                response.statusCode = 404;
                return response.json({"title": "error", "message": "Not Found", "status": "fail"});
            }
            // Remove by query
            deleteByQuery(search());
        });

    } else {
        // Remove all our difestors logs
        deleteByQuery(search());
    }


    function deleteByQuery(query) {
        client.deleteByQuery({
            index: 'logs',
            type: 'log',
            body: query,
        }).then(function (metrics) {
            response.statusCode = 204;
            return response.json({action: 'deleteAll', result: true});
        }, function (error, body, code) {
            console.trace("error: ", error.message);
            if (error) throw new Error(error);
            response.statusCode = 500;
            return next(error);
        });
    }
};
