var mongoose = require('mongoose'),
    conf = require('../config'),
    Schema = mongoose.Schema,
    passportLocalMongoose = require('passport-local-mongoose'),
    jwt = require('jwt-simple'),
    tokenSecret = 'apicatus-secret';

var Token = new Schema({
    token: {type: String},
    date_created: {type: Date, default: Date.now},
});

Token.methods.hasExpired = function() {
    var now = new Date();
    return (now.getTime() - this.date_created.getTime()) > conf.ttl;
};
var TokenModel = mongoose.model('Token', Token);

var Account = new Schema({
    username: { type: String, required: true},
    name: { type: String, required: false },
    last_name: { type: String, required: false },
    email: { type: String, required: true },
    country: { type: String, required: false },
    city: { type: String, required: false },
    time_zone: { type: String, required: false },
    birthDate: {type: Date},
    digestors: { type: Array, required: false },
    date_created: {type: Date, default: Date.now},
    digestors: [{ type: Schema.Types.ObjectId, ref: 'Digestor' }],
    token: {type: Object},
    //For reset we use a reset token with an expiry (which must be checked)
    reset_token: {type: String},
    reset_token_expires_millis: {type: Number}
});

Account.plugin(passportLocalMongoose);

Account.statics.encode = function(data) {
    return jwt.encode(data, tokenSecret);
};
Account.statics.decode = function(data) {
    var self = this;
    return jwt.decode(data, tokenSecret);
};
Account.statics.verify = function(token, cb) {
    var now = new Date();
    var decoded = this.decode(token);
    if (decoded && decoded.email) {
        this.findOne({email: decoded.email}, function(error, user) {
            if (error || !user) {
                cb(new Error(error), false);
            } else if (token === user.token.token) {
                // Verify if token has expired
                cb(false, (now.getTime() - user.token.date_created.getTime() < conf.ttl));
            }
        });
    } else {
        cb(new Error('Token could not be verified.'), false);
    }
};
Account.statics.findUser = function(email, token, cb) {
    var self = this;
    this.findOne({email: email}, function(error, user) {
        if(error || !user) {
            cb(error, null);
        } else if (token === user.token.token) {
            cb(false, {
                email: user.email,
                token: user.token,
                date_created: user.date_created,
                full_name: user.full_name,
                username: user.username,
                digestors: user.digestors
            });
        } else {
            cb(new Error('Token does not match.'), null);
        }
    });
};

Account.statics.findUserByEmailOnly = function(email, cb) {
    var self = this;
    this.findOne({email: email}, function(err, usr) {
        if(err || !usr) {
            cb(err, null);
        } else {
            cb(false, usr);
        }
    });
};
Account.statics.createUserToken = function(email, cb) {
    var self = this;
    this.findOne({email: email}, function(err, usr) {
        if(err || !usr) {
            console.log('err');
        }
        //Create a token and add to user and save
        var token = self.encode({email: email});
        usr.token = new TokenModel({token:token});
        usr.save(function(err, usr) {
            if (err) {
                cb(err, null);
            } else {
                console.log("about to cb with usr.token.token: " + usr.token.token);
                cb(false, usr.token.token); //token object, in turn, has a token property :)
            }
        });
    });
};

Account.statics.generateResetToken = function(email, cb) {
    console.log("in generateResetToken....");
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
            cb(new Error('No user with that email found.'), null);
        }
    });
};

module.exports = mongoose.model('Account', Account);