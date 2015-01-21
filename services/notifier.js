///////////////////////////////////////////////////////////////////////////////
// @file         : notifier.js                                               //
// @summary      : Socket.io Notification Manager                            //
// @version      : 0.1                                                       //
// @project      : Apicatus                                                  //
// @description  :                                                           //
// @author       : Benjamin Maggi                                            //
// @email        : benjaminmaggi@gmail.com                                   //
// @date         : 19 Oct 2014                                               //
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

// Controllers
var conf = require('../config'),
	socketio  = require('socket.io'),
    Account = require('../models/account');


var rooms = ['global'];
var users = {};
var sockets = [];
var io = null;

exports.setup = function(server) {
    'use strict';
	io = socketio.listen(server);

    ///////////////////////////////////////////////////////////////////////////////
    // socket.io                                                                 //
    ///////////////////////////////////////////////////////////////////////////////
    io.on('connection', function (socket) {


        sockets.push(socket);

        socket.emit('message', {
            greet: 'hello',
            user: socket.user
        });

        socket.on('userLoggedIn', function (data) {
            console.log("userLoggedIn: ", data);
        });

        socket.on('disconnect', function () {
            console.log("disconnect: ", socket.user);
            var id = socket.user._id;
            // Remove Socket from list
            sockets = sockets.filter(function(socket){
                return socket.user._id != id;
            });
        });

    });
    io.on('disconnect', function () {
        console.log("Socket disconnected");
        io.sockets.emit('pageview', { 'connections': Object.keys(io.connected).length });
    });
    io.use(function(socket, next) {
        var token = socket.handshake.query.token;
        if(token) {
            Account.verify(token, function(error, expired, decoded) {
                if(error) {
                    next(new Error('Invalid Token'));
                    return socket.disconnect('unauthorized');
                } else if(expired) {
                    next(new Error('Token expired. You need to log in again.'));
                    return socket.disconnect('unauthorized');
                } else {
                    socket.user = decoded;
                    return next();
                }
            });
        } else {
            next(new Error('not authorized'));
            return socket.disconnect('unauthorized');
        }
        //next();
    });

    return io;
};

exports.notify = function(log, event) {
    'use strict';
    var notifySockets = sockets.filter(function(socket){
        return (socket.user.digestors.indexOf(log.digestor) > -1);
    });
    var users = notifySockets.map(function(socket){
        return socket.user;
    });
    // console.log("notify: ", event, log.digestor, users[0].username, io.sockets.socket);
    // notify digestor owners
    notifySockets.forEach(function(socket, index){
        //socket.emit('message', {greet: socket.user._id});
        Account.verify(socket.user.token.token, function(error, expired, decoded) {
            if(error) {
                socket.disconnect('unauthorized');
                sockets.splice(index, 1);
                return new Error('Invalid Token');
            } else if(expired) {
                socket.disconnect('unauthorized');
                sockets.splice(index, 1);
                return new Error('Token expired. You need to log in again.');
            }
        });

        socket.emit('message', {log: log});
    });
};


