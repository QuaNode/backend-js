/*jslint node: true */
/*jshint esversion: 6 */
"use strict";

var define = require("define-js");
var Behaviours = require("js-behaviours");
var {
    BusinessBehaviour
} = require("behaviours-js");
var {
    businessController
} = require("./controller.js");

module.exports.getRemoteBehaviour = function () {

    var [
        options,
        config,
        types,
        BEHAVIOURS,
        defaultTenants,
        defaultRemotes,
        FetchBehaviours
    ] = arguments;
    var getRBConstructor = function (init) {

        return function () {

            var [
                ȯptions, _, getDatabase
            ] = arguments;
            if (!ȯptions) ȯptions = {};
            if (ȯptions.parameters) {

                ȯptions[
                    "inputObjects"
                ] = ȯptions.parameters;
            }
            var self = init.apply(...[
                this, arguments
            ]).self();
            if (!self.hasOwnProperty(...[
                "parameters"
            ])) Object.defineProperty(...[
                self,
                "parameters",
                {
                    enumerable: true,
                    get() {

                        return self[
                            "inputObjects"
                        ];
                    },
                    set(parameters) {

                        self[
                            "inputObjects"
                        ] = parameters;
                    }
                }
            ]);
            var typeOf = typeof getDatabase;
            if (typeOf !== "function") {

                getDatabase = function () {

                    return ȯptions.database;
                };
            }
            self.run = function () {

                let [
                    behaviour,
                    parameters,
                    callback,
                    opts
                ] = arguments;
                var storage,
                    fetcher,
                    fetching,
                    FetchBehaviour,
                    memory,
                    operations;
                let BB = BusinessBehaviour;
                if (behaviour instanceof BB) {

                    opts = callback;
                    callback = parameters;
                }
                var {
                    queue,
                    database,
                    later
                } = opts || {};
                if (typeof callback !== "function") {

                    throw new Error("Invalid behaviour" +
                        " callback");
                }
                var { controller: self_queue } = self;
                var queuě = self_queue || options.queue;
                if (typeof queuě === "function") {

                    queuě = queuě(...[
                        options.name,
                        self.inputObjects
                    ]);
                }
                if (!database) {

                    database = getDatabase();
                }
                if (!(behaviour instanceof BB)) {

                    let _ = typeof behaviour;
                    let invalid = _ !== "string";
                    if (!invalid) {

                        invalid |= !BEHAVIOURS[
                            behaviour
                        ];
                    }
                    if (invalid) {

                        throw new Error("Invalid" +
                            " behaviour name");
                    }
                    var ȯptiȯns = BEHAVIOURS[
                        behaviour
                    ].options;
                    storage = ȯptiȯns.storage;
                    fetcher = ȯptiȯns.fetcher;
                    fetching = options.fetching;
                    if (fetcher) {

                        FetchBehaviour = BEHAVIOURS[
                            behaviour
                        ].constructor;
                    }
                    memory = ȯptiȯns.memory;
                    operations = ȯptiȯns.operations;
                    _ = typeof parameters;
                    if (_ === "function") {

                        behaviour = parameters(...[
                            BEHAVIOURS[
                                behaviour
                            ].constructor
                        ]);
                    } else behaviour = new BEHAVIOURS[
                        behaviour
                    ].constructor({

                        name: behaviour,
                        type: types[options.type],
                        priority: options.priority || 0,
                        timeout: ȯptiȯns.timeout,
                        inputObjects: parameters
                    }, self.getEmitterId, function () {

                        return database;
                    });
                    if (!queue && ȯptiȯns.queue) {

                        var any = !!database;
                        any |= !!storage;
                        any |= !!fetcher;
                        any |= !!fetching;
                        if (any) {

                            queue = ȯptiȯns.queue;
                            _ = typeof queue;
                            if (_ === "function") {

                                queue = queue(...[
                                    ȯptiȯns.name,
                                    behaviour.parameters
                                ]);
                            }
                        }
                    }
                }
                behaviour.getEmitterId = self.getEmitterId;
                behaviour.isCompleted = self.isCompleted;
                behaviour.setOption("database", database);
                if (!queue) queue = queuě;
                if (queue == queuě && !later) {

                    let _ = typeof parameters;
                    var mandatory = _ !== "function";
                    mandatory |= callback == parameters;
                    if (mandatory) {

                        self.mandatoryBehaviour = behaviour;
                    }
                }
                if (!FetchBehaviour) {

                    var fetch = "";
                    let _ = typeof options.fetcher;
                    if (_ === "string") {

                        fetch = options.fetcher;
                    } else {

                        _ = typeof fetching;
                        if (_ === "string") {

                            fetch = fetching;
                        } else {

                            _ = typeof options.fetching;
                            if (_ === "string") {

                                fetch = options.fetching;
                            }
                        }
                    }
                    FetchBehaviour = FetchBehaviours[fetch];
                }
                if (!storage) storage = options.storage;
                if (!fetcher) fetcher = options.fetcher;
                if (!fetcher) fetcher = fetching;
                if (!fetcher) fetcher = options.fetching;
                if (!memory) memory = options.memory;
                if (!operations) {

                    operations = options.operations;
                }
                let cancel = businessController(...[
                    behaviour.name,
                    queue,
                    database,
                    storage,
                    fetcher,
                    FetchBehaviour,
                    memory,
                    operations
                ]).runBehaviour(behaviour, null, callback);
                let _cancel = self.cancel;
                self.cancel = function () {

                    cancel();
                    if (typeof _cancel === 'function') {

                        _cancel();
                    }
                };
                return self;
            };
            self.runLater = function () {

                let [
                    behaviour,
                    parameters,
                    callback,
                    opts
                ] = arguments;
                if (!opts) opts = {};
                opts.later = true;
                return self.run(...[
                    behaviour,
                    parameters,
                    callback,
                    opts
                ]);
            };
            self.remote = function (baseURL) {

                return {

                    run() {

                        let [
                            behaviour,
                            parameters,
                            callback,
                            opts
                        ] = arguments;
                        if (baseURL === "local") {

                            return self.run(...[
                                behaviour,
                                parameters,
                                callback,
                                opts
                            ]);
                        }
                        let _ = typeof behaviour;
                        var no_name = _ !== "string";
                        if (!no_name) {

                            no_name |= behaviour.length === 0;
                        }
                        if (no_name) {

                            throw new Error("Invalid " +
                                "behaviour name");
                        }
                        var { database } = opts || {};
                        if (!database) {

                            database = getDatabase();
                        }
                        var remotes, tenants;
                        if (typeof config === "object") {

                            tenants = config.tenants;
                            remotes = config.remotes;
                        }
                        var tenantID = (Object.assign(...[
                            {},
                            defaultTenants,
                            tenants,
                        ])[database] || {}).id;
                        var tenant;
                        if (tenantID || database) {

                            tenant = {

                                key: 'Behaviour-Tenant',
                                type: 'header',
                                value: tenantID || database
                            };
                        }
                        var remoteURL = Object.assign(...[
                            {},
                            defaultRemotes,
                            remotes
                        ])[baseURL];
                        var behaviours;
                        if (remoteURL) baseURL = remoteURL;
                        _ = typeof baseURL;
                        var url_string = _ === "string";
                        if (url_string) {

                            url_string &= baseURL.length > 0;
                        }
                        if (baseURL instanceof Behaviours) {

                            behaviours = baseURL;
                        } else if (url_string) {

                            behaviours = new Behaviours(...[
                                baseURL
                            ]);
                            if (defaultRemotes[baseURL]) {

                                defaultRemotes[
                                    baseURL
                                ] = behaviours;
                            } else {

                                _ = typeof remotes;
                                if (_ === "object") {

                                    remotes[
                                        baseURL
                                    ] = behaviours;
                                }
                            }
                        } else {

                            throw new Error("Invalid" +
                                " remote base URL");
                        }
                        behaviours.ready(function () {

                            let cancel = behaviours[
                                behaviour
                            ](parameters, callback, {

                                __tenant__: tenant
                            });
                            let _cancel = self.cancel;
                            self.cancel = function () {

                                if (cancel) cancel();
                                _ = typeof _cancel;
                                if (_ === 'function') {

                                    _cancel();
                                }
                            };
                        });
                        return self;
                    }
                };
            };
        }
    };
    if (typeof options.inherits === "function") {

        return define(getRBConstructor).extend(...[
            options.inherits
        ]).defaults({

            type: types[options.type],
            inputObjects: options.defaults
        })
    }
    return define(getRBConstructor).extend(...[
        BusinessBehaviour
    ]).defaults({

        type: types[options.type]
    });
};