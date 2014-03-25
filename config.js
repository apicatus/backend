///////////////////////////////////////////////////////////////////////////////
// Primary configuration file                                                //
///////////////////////////////////////////////////////////////////////////////
var os = require("os");

var environments = {
    ///////////////////////////////////////////////////////////////////////////
    // Development options                                                   //
    ///////////////////////////////////////////////////////////////////////////
    "development": {
        sessionSecret: "secret",
        oAuthServices: {
            github: {
                clientId: "1b147fb22f603248b539",
                clientSecret: "d388480af4a706862f25b9fa493356fac09f7cee"
            }
        },
        environment: process.env.NODE_ENV,
        listenPort: process.env.PORT || 8080,
        ip: process.env.IP || '127.0.0.1',
        baseUrl: 'miapi.com',
        allowCrossDomain: false,
        autoStart: true,
        ttl: (1000 * 60 * 100), // 10 minutes
        resetTokenExpiresMinutes: 20,
        staticPath: "/Users/benjius/Desktop/apicatus/frontend/build",
        mongoUrl: {
            hostname: "paulo.mongohq.com",
            port: 10026,
            username: "admin",
            password: "admin",
            name: "",
            db: "apicatus"
        }
    },
    ///////////////////////////////////////////////////////////////////////////
    // Testing options                                                       //
    // Warning: DB must be empty, do not use dev or prod databases           //
    ///////////////////////////////////////////////////////////////////////////
    "test": {
        sessionSecret: "secret",
        oAuthServices: {
            github: {
                clientId: "1b147fb22f603248b539",
                clientSecret: "d388480af4a706862f25b9fa493356fac09f7cee"
            }
        },
        environment: process.env.NODE_ENV,
        listenPort: process.env.PORT || 8080,
        ip: process.env.IP || os.hostname(),
        baseUrl: 'miapi.com',
        allowCrossDomain: false,
        autoStart: false,
        ttl: 1000,
        resetTokenExpiresMinutes: 20,
        staticPath: "/frontend/build",
        mongoUrl: {
            hostname: "paulo.mongohq.com",
            port: 10026,
            username: "admin",
            password: "admin",
            name: "",
            db: "apicatus"
        }
    },
    ///////////////////////////////////////////////////////////////////////////
    // Production options OpenShift                                          //
    ///////////////////////////////////////////////////////////////////////////
    production: {
        sessionSecret: process.env.SECRET,
        oAuthServices: {
            github: {
                clientId: "1b147fb22f603248b539",
                clientSecret: "d388480af4a706862f25b9fa493356fac09f7cee"
            }
        },
        environment: process.env.NODE_ENV,
        listenPort: process.env.PORT || 8080,
        ip: process.env.IP || '127.0.0.1',
        baseUrl: 'apicat.us',
        allowCrossDomain: false,
        autoStart: true,
        ttl: 3600000,
        resetTokenExpiresMinutes: 20,
        staticPath: "./frontend/build",
        mongoUrl: {
            hostname: "paulo.mongohq.com",
            port: 10026,
            username: process.env.MONGO_USER,
            password: process.env.MONGO_PASS,
            name: "",
            db: "apicatus"
        }
    }
}
module.exports = (function(){
    var env = process.env.NODE_ENV || 'production';
    return environments[env];
})();
