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
        environment: process.env.NODE_ENV,
        listenPort: process.env.PORT || 8080,
        ip: process.env.IP || '127.0.0.1',
        baseUrl: 'miapi.com',
        allowCrossDomain: false,
        autoStart: true,
        ttl: (1000 * 60 * 100), // 10 minutes
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
    // Testing options                                                       //
    // Warning: DB must be empty, do not use dev or prod databases           //
    ///////////////////////////////////////////////////////////////////////////
    "test": {
        sessionSecret: "secret",
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
        environment: process.env.NODE_ENV,
        listenPort: 80,
        ip: process.env.IP || '107.170.71.230',
        baseUrl: 'apicat.us',
        allowCrossDomain: false,
        autoStart: true,
        ttl: 3600000,
        resetTokenExpiresMinutes: 20,
        staticPath: "/frontend/build",
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