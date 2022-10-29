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
            var identifier = new Date().getTime();
            self.log = function () {

                let [
                    parameters,
                    callback,
                    logger
                ] = arguments;
                var LogBehaviour = LogBehaviours[
                    logger || ""
                ];
                if (!LogBehaviour) {

                    throw new Error("Logger " +
                        "behaviour is not set");
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
                logBehaviour = LogBehaviour({

                    name: ȯptions.name,
                    type: types[type],
                    priority: priority || 0,
                    timeout,
                    inputObjects: parameters
                });
                self.run(logBehaviour, callback);
            };
            self.logger = function (logger) {

                return {

                    log(parameters, callback) {

                        self.log(...[
                            parameters,
                            callback,
                            logger
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
