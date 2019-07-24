/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

let raygunTransport = require('./raygun.transport');
let MessageBuilder = require('./raygun.messageBuilder');

var Raygun = function () {

    var _apiKey, _filters, raygun = this,
        _user, _version, _tags;
    raygun.init = function (options) {

        _apiKey = options.apiKey;
        _filters = options.filters;
        return raygun;
    };
    raygun.user = function () {


    };
    raygun.withTags = function (tags) {

        _tags = tags;
        return raygun;
    };
    // This function is deprecated, is provided for legacy apps and will be
    // removed in 1.0: use raygun.user instead
    raygun.setUser = function (user) {

        _user = user;
        return raygun;
    };
    raygun.setVersion = function (version) {

        _version = version;
        return raygun;
    };
    raygun.send = function (exception, customData, callback, request) {

        var builder = new MessageBuilder({

            filters: _filters,
            tags: _tags
        })
            .setErrorDetails(exception)
            .setRequestDetails(request)
            .setMachineName()
            .setEnvironmentDetails()
            .setUserCustomData(customData)
            .setUser(raygun.user(request) || _user)
            .setVersion(_version);
        var message = builder.build();
        raygunTransport.send({

            message: message,
            apiKey: _apiKey,
            callback: callback
        });
        return message;
    };
    raygun.expressHandler = function (err, req, res, next) {

        raygun.send(err, {}, function () {
        }, req);
        next(err);
    };
};
exports.Client = Raygun;
