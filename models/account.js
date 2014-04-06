///////////////////////////////////////////////////////////////////////////////
// @file         : account.js                                                //
// @summary      : Account schema & static helpers                           //
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
    config = require('../config'),
    Schema = mongoose.Schema,
    passportLocalMongoose = require('passport-local-mongoose'),
    jwt = require('jwt-simple'),
    tokenSecret = 'apicatus-secret';

var Token = new Schema({
    token: {type: String},
    date_created: {type: Date, default: Date.now},
});

Token.methods.hasExpired = function(created) {
    'use strict';

    var now = new Date();
    var diff = (now.getTime() - created);
    return diff > config.ttl;
};
var TokenModel = mongoose.model('Token', Token);

var Account = new Schema({
    username: { type: String, required: true},
    email: { type: String, required: true },
    name: { type: String, required: false },
    lastName: { type: String, required: false },
    country: { type: String, required: false },
    city: { type: String, required: false },
    timeZone: { type: String, required: false },
    avatar: { type: String, required: false },
    company: { type: String, required: false },
    birthDate: {type: Date},
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    digestors: [{ type: Schema.Types.ObjectId, ref: 'Digestor' }],
    token: {type: Object},
    githubId: { type: String, required: false },
    oAuth: {
        token: { type: String, required: false}
    },
    //For reset we use a reset token with an expiry (which must be checked)
    reset_token: {type: String},
    reset_token_expires_millis: {type: Number}
});

// About password security read:
// http://security.stackexchange.com/questions/31564/key-length-and-hash-function-in-pbkdf2
// http://stackoverflow.com/questions/17218089/salt-and-hash-using-pbkdf2
Account.plugin(passportLocalMongoose, {
    saltlen: 32,        // specifies the salt length in bytes
    iterations: 25000,  // specifies the number of iterations used in pbkdf2 hashing algorithm.
    keylen: 512         // specifies the length in byte of the generated key
});

/*Account.statics.findOrCreate = function(conditions, doc, options, callback) {
    'use strict';

    if (arguments.length < 4) {
        if (typeof options === 'function') {
            // Scenario: findOrCreate(conditions, doc, callback)
            callback = options;
            options = {};
        } else if (typeof doc === 'function') {
            // Scenario: findOrCreate(conditions, callback);
            callback = doc;
            doc = {};
            options = {};
        }
    }
    var self = this;
    this.findOne(conditions, function (err, result) {
        if (err || result) {
            if (options && options.upsert && !err) {
                self.update(conditions, doc, function (err) {
                    if (err) {
                        console.log("error");
                        callback(new Error(err), false);
                    } else {
                        self.findOne(conditions, function (err, result) {
                            callback(err, result, false);
                        });
                    }
                });
            } else {
                callback(err, result, false);
            }
        } else {
            for (var key in doc) {
                conditions[key] = doc[key];
            }
            console.log("conditions:", JSON.stringify(conditions, null, 4));
            var obj = new self(conditions);
            obj.save(function (err) {
                callback(err, obj, true);
            });
        }
    });
};*/

Account.statics.encode = function(data) {
    'use strict';

    return jwt.encode(data, tokenSecret);
};
Account.statics.decode = function(data) {
    'use strict';

    var decoded = null;
    try {
        decoded = jwt.decode(data, tokenSecret);
    }
    catch(error) {
        //console.log(error);
        decoded = null;
    }
    return decoded;
};
Account.statics.verify = function(token, cb) {
    'use strict';

    var decoded = this.decode(token);
    if (decoded && decoded.email) {
        this.findOne({email: decoded.email}, function(error, user) {
            if (error || !user || !user.token) {
                cb(new Error(error), false);
            } else if (token === user.token.token) {
                // Verify if token has expired
                user = {
                     _id: user._id,
                    email: user.email,
                    token: user.token,
                    date_created: user.date_created,
                    full_name: user.full_name,
                    username: user.username,
                    avatar: user.avatar,
                    digestors: user.digestors
                };
                cb(false, (Token.methods.hasExpired(user.token.date_created.getTime())), user);
            }
        });
    } else {
        cb(new Error('Token could not be verified.'), false);
    }
};
Account.statics.findUser = function(email, token, cb) {
    'use strict';

    this.findOne({email: email}, function(error, user) {
        if(error || !user) {
            cb(error, null);
        } else if (token === user.token.token) {
            cb(false, {
                 _id: user._id,
                email: user.email,
                token: user.token,
                date_created: user.date_created,
                full_name: user.full_name,
                username: user.username,
                avatar: user.avatar,
                digestors: user.digestors
            });
        } else {
            cb(new Error('Token does not match.'), null);
        }
    });
};
Account.statics.findUserByToken = function(token, cb) {
    'use strict';

    var self = this;
    var decoded = self.decode(token);
    self.findUser(decoded.email, token, cb);
};
Account.statics.findUserByEmailOnly = function(email, cb) {
    'use strict';

    this.findOne({email: email}, function(err, usr) {
        if(err || !usr) {
            cb(err, null);
        } else {
            cb(false, usr);
        }
    });
};
Account.statics.createUserToken = function(email, cb) {
    'use strict';

    var self = this;
    this.findOne({email: email}, function(error, user) {
        if(error || !user) {
            cb(error, null);
        }
        //Create a token and add to user and save
        var token = self.encode({email: email});
        user.token = new TokenModel({token: token});
        user.save(function(err, usr) {
            if (err || !usr) {
                cb(err, null);
            } else {
                cb(false, usr); //token object, in turn, has a token property :)
            }
        });
    });
};

Account.statics.deleteUserToken = function(email, cb) {
    'use strict';

    this.findOne({email: email}, function(error, user) {
        if(error || !user) {
            console.log("deleteUserToken error");
            cb(error, null);
        }
        //Create a token and add to user and save
        delete user.token;
        user.save(function(err, usr) {
            if (err || !usr) {
                cb(err, null);
            } else {
                //console.log("about to cb with usr.token.token: " + usr.token.token);
                cb(false, usr); //token object, in turn, has a token property :)
            }
        });
    });
};
Account.statics.invalidateUserToken = function(email, cb) {
    'use strict';

    this.findOne({email: email}, function(error, user) {
        if(error || !user) {
            console.log('error');
            cb(error, null);
        }
        user.token = null;
        user.save(function(error, user) {
            if (error || !user) {
                cb(error, null);
            } else {
                cb(false, 'removed');
            }
        });
    });
};
Account.statics.generateResetToken = function(email, cb) {
    'use strict';

    this.findUserByEmailOnly(email, function(err, user) {
        if (err) {
            cb(err, null);
        } else if (user) {
            //Generate reset token and URL link; also, create expiry for reset token
            user.reset_token = require('crypto').randomBytes(32).toString('hex');
            var now = new Date();
            var expires = new Date(now.getTime() + (config.resetTokenExpiresMinutes * 60 * 1000)).getTime();
            user.reset_token_expires_millis = expires;
            user.save();
            cb(false, user);
        } else {
            //TODO: This is not really robust and we should probably return an error code or something here
            console.log('No user with that email found.');
            cb(new Error('No user with that email found.'), null);
        }
    });
};

module.exports = mongoose.model('Account', Account);
