/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

let http = require('../../../service/lib/http-browserify/http.js');

var send = function (options) {

    var data = options.data || JSON.stringify(options.message);
    var httpOptions = {

        scheme: 'https',
        host: 'api.raygun.io',
        path: '/entries',
        method: 'POST',
        headers: {

            'Content-Type': 'application/json',
            'Content-Length': data.length,
            'X-ApiKey': options.apiKey
        }
    };
    var request = http.request(httpOptions, function (response) {

        if (options.callback) {

            options.callback(data, response);
        }
    });
    request.end(data);
};

exports.send = send;
