///////////////////////////////////////////////////////////////////////////////
// @file         : notifier.js                                               //
// @summary      : Socket.io Notification Manager                            //
// @version      : 0.1                                                       //
// @project      : Apicatus                                                  //
// @description  :                                                           //
// @author       : Benjamin Maggi                                            //
// @email        : benjaminmaggi@gmail.com                                   //
// @date         : 19 Oct 2014                                               //
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
    mongoose = require('mongoose'),
	socketio  = require('socket.io');

// Load model
var digestor_schema = require('../models/digestor'),
    Digestor = mongoose.model('Digestor', digestor_schema);

// Load Account model
var account_schema = require('../models/account'),
    Account = mongoose.model('Account', account_schema);

exports.setup = function(server) {
    'use strict';
	var socket = socketio.listen(server);
    ///////////////////////////////////////////////////////////////////////////////
    // socket.io                                                                 //
    ///////////////////////////////////////////////////////////////////////////////
    socket.on('connection', function (socket) {
        socket.emit('message', { hello: 'sockets: world' });
        socket.on('angularMessage', function (data) {
            console.log(data);
        });
    });
    socket.on('connection', function (socket) {
        socket.emit('message', { hello: 'world' });
        socket.on('angularMessage', function (data) {
            console.log(data);
        });
    });
    socket.on('disconnect', function () {
        console.log("Socket disconnected");
        socket.emit('pageview', { 'connections': Object.keys(socket.connected).length });
    });
    socket.use(function(socket, next) {
        var handshakeData = socket.request;
        var token = socket.handshake.query.token;
        console.log('handshakeData:', socket.handshake.query.token);
        if(token != '1234') {
            next(new Error('not authorized'));
            return socket.disconnect('unauthorized');
        }
        next();
    });

    return socket;
};


