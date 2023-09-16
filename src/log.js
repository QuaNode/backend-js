/*jslint node: true */
/*jshint esversion: 6 */
"use strict";

var define = require("define-js");
var {
    getEventBehaviour
} = require("./event.js");

module.exports.getLogBehaviour = function () {

    var [
        options,
        config,
        types,
        BEHAVIOURS,
        defaultRemotes,
        FetchBehaviours,
        LogBehaviours,
        getEmitters
    ] = arguments;
    var getLBConstructor = function (init) {

        return function () {

            var self = init.apply(...[
                this, arguments
            ]).self();
            var [
                ȯptions, _, getDatabase
            ] = arguments;
            var identifier = new Date().getTime();
            var typeOf = typeof getDatabase;
            if (typeOf !== "function") {

                getDatabase = function () {

                    return ȯptions.database;
                };
            }
            self.log = function () {

                let [
                    parameters,
                    callback,
                    opts
                ] = arguments;
                var { logger, database } = opts || {};
                var LogBehaviour = LogBehaviours[
                    logger || ""
                ];
                if (!LogBehaviour) {

                    throw new Error("Logger " +
                        "behaviour is not set");
                }
                if (!database) {

                    database = getDatabase();
                }
                var ȯptions = Object.keys(...[
                    BEHAVIOURS
                ]).reduce(function (ȯptions, name) {

                    let {
                        constructor
                    } = BEHAVIOURS[name];
                    if (constructor == LogBehaviour) {

                        return BEHAVIOURS[
                            name
                        ].options;
                    }
                    return ȯptions;
                }, {});
                if (typeof parameters !== "object") {

                    parameters = {};
                }
                parameters.identifier = identifier;
                let type = ȯptions.type;
                if (!type) {

                    type = options.type;
                }
                let priority = ȯptions.priority;
                if (!priority) {

                    priority = options.priority;
                }
                let timeout = ȯptions.timeout;
                if (!timeout) {

                    timeout = options.timeout;
                }
                logBehaviour = new LogBehaviour({

                    name: ȯptions.name,
                    type: types[type],
                    priority: priority || 0,
                    timeout,
                    inputObjects: parameters
                }, self.getEmitterId, function () {

                    return database;
                });
                logBehaviour[
                    "isCompleted"
                ] = self.isCompleted;
                self.run(logBehaviour, callback);
            };
            self.logger = function (logger) {

                return {

                    log(parameters, callback) {

                        self.log(...[
                            parameters,
                            callback,
                            { logger }
                        ]);
                    }
                };
            };
        };
    };
    return define(getLBConstructor).extend(getEventBehaviour(...[
        options,
        config,
        types,
        BEHAVIOURS,
        defaultRemotes,
        FetchBehaviours,
        getEmitters
    ])).defaults({

        type: types[options.type]
    });
};
