/*jslint node: true */
'use strict';

var define = require('define-js');
var ServiceAdapter = require('./service/ServiceAdapter.js').ServiceAdapter;
var ServiceEndPoint = require('./service/ServiceEndPoint.js').ServiceEndPoint;
var ServiceAuthanticator = require('./service/ServiceAuthanticator.js').ServiceAuthanticator;


module.exports.service = function (baseURL, path, sendRequest, endPointOptions, authanticatorOptions) {


    if (typeof baseURL !== 'string') {

        throw new Error('Invalid baseURL object');
    }
    if (typeof endPointOptions !== 'object') {

        throw new Error('Invalid endpoint options');
    }
    if (typeof path !== 'string') {

        throw new Error('Invalid path');
    }
    if (typeof authanticatorOptions !== 'object') {

        throw new Error('Invalid authanticator options');
    }
    if (typeof sendRequest !== 'function') {

        throw new Error('Invalid sendRequest definition');
    }
    if (typeof sendRequest.lenght !== 2) {

        throw new Error('Invalid sendRequest parameter must be 2');
    }
    var Authenticator = define(function (init) {

        return function () {

            var self = init.apply(this, arguments).self();
            for (var key in authanticatorOptions) {

                if (authanticatorOptions.hasOwnProperty(key)) {

                    self.key = authanticatorOptions[key];
                }
            }
        }
    }).extend(ServiceAuthenticator).parameters();

    var Adapter = define(function (init) {

        return function (baseURL, options) {

            var self = init.apply(this, arguments).self();
            
            self.authanticator = new Authenticator();
            self.sendRequest = function (request, callback) {

                sendRequest(request, callback, baseURL, options);
             };
        }
    }).extend(ServiceAdapter).parameters(baseURL);

    var EndPoint = define(function (init) {

        return function(options, adapterOptions) {

           /* var responseMetadata = new ServiceObjectMetadata({

                model: 'Book',
                name: '',
                id: 'SKU'
            });
            options.responseMetadata = responseMetadata;
            */
            options.modelAttributes = options.model || endPointOptions.model;
            options.serviceAttributes = options.service || endPointOptions.service;
            options.baseURL = baseURL;
            options.Adapter = Adapter;

            var self = init.apply(this, arguments).self();
            self.path = path;
            self.adapter = function () {

                return sṵper.adapter(adapterOptions);
            };
        }
    }).extend(ServiceEndPoint).parameters({

        baseURL: baseURL,
        Adapter: Adapter,
        responseMetadata: endPointOptions.response,
        modelAttributes: endPointOptions.model,
        serviceAttributes: endPointOptions.service
    });


};
``