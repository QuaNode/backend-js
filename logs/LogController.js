/*jslint node: true */
/*jshint esversion: 6 */
/*global document*/
/*global device*/
/*global window*/
'use strict';

let raygun = require('./lib/raygun/raygun.js');
let sendToRaygun = require('./lib/raygun/raygun.transport.js').send;
let EdushareAppConfig = require('../utils/EdushareAppConfig.js').EdushareAppConfig;

var deviceID = null;

var LogController = function() {

    var self = this;
    var callback = null;
    var raygunClient = new raygun.Client().init({

        apiKey: 'wyP8GUKC1z1sWW3ikueT1w=='
    });
    raygunClient.setVersion('' + EdushareAppConfig.ServerVersion);
    if (!deviceID) document.addEventListener('deviceready', function() {

        deviceID = device.platform.toLowerCase();
        raygunClient.withTags([deviceID]);
        sendSavedErrors();
        if (typeof callback === 'function') callback();
        callback = null;
    });
    var load = function(afterLoad) {

        if (!deviceID) callback = afterLoad;
        else if (typeof afterLoad === 'function') afterLoad();
    };
    var sendSavedErrors = function() {

        var callback = function(data, res) {

            res.on('end', function() {

                window.localStorage.removeItem(key);
            });
        };
        for (var key in window.localStorage) {

            if (key.substring(0, 9) === 'raygunjs=') {

                sendToRaygun({

                    data: window.localStorage.getItem(key),
                    callback: callback
                });
            }
        }
    };
    var offlineSave = function(data) {

        var dateTime = new Date().toJSON();
        try {

            var key = 'raygunjs=' + dateTime + '=' + (Math.floor(Math.random() * 9007199254740993));
            if (typeof window.localStorage.getItem(key) === 'undefined') {

                window.localStorage.setItem(key, data);
            }
        } catch (e) {

            console.log('Raygun: LocalStorage full, cannot save exception');
        }
    };
    self.log = function(error, user) {

        load(function() {

            if (user && user.id) raygunClient.user = function() {

                return function() {

                    return {

                        identifier: user.id,
                        fullName: user.username,
                        uuid: deviceID
                    };
                };
            };
            raygunClient.send(error, null, function(data, res) {

                res.on('end', function() {

                    sendSavedErrors();
                });
                res.on('error', function(error) {

                    if (error && error.code > 300 && error.code !== 403 && error.code !== 400) offlineSave(data);
                });
            });
        });
    };
};

module.exports.LogController = LogController;
