/*jslint node: true */
/*jshint esversion: 6 */
"use strict";

var define = require("define-js");
var Behaviours = require("js-behaviours");
var {
    BusinessBehaviour
} = require("behaviours-js");
var debug = require("debug");
var {
    businessController
} = require("./controller");

debug.enable("backend:*");
debug = debug("backend:remote");

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
            let typeOf = typeof getDatabase;
            if (typeOf !== "function") {

                getDatabase = function () {

                    return ȯptions.database;
                };
            }
            var getPromise = function () {

                let [
                    baseURL = "local",
                    behaviour,
                    parameters,
                    callback,
                    opts
                ] = arguments;
                var awaiting = false;
                var argsLen = arguments.length;
                var getParameters = () => [
                    parameters
                ];
                let BB = BusinessBehaviour;
                if (behaviour instanceof BB) {

                    opts = callback;
                    callback = parameters;
                    awaiting = argsLen === 2;
                    getParameters = () => [];
                } else awaiting = argsLen === 3;
                let __ = typeof callback;
                if (__ !== "function") {

                    awaiting = true;
                }
                if (!awaiting) return;
                opts = callback;
                var executor = function () {

                    var [
                        resolve, reject
                    ] = arguments;
                    callback = function () {

                        let [
                            res, err
                        ] = arguments;
                        if (err) {

                            reject(err);
                        } else resolve(res);
                    };
                    self.remote(baseURL).run(...[
                        behaviour,
                        ...getParameters(),
                        callback,
                        opts
                    ]);
                }
                return new Promise(executor);
            };
            self.run = function () {

                let [
                    behaviour,
                    parameters,
                    callback,
                    opts
                ] = arguments;
                var promise = getPromise(...[
                    "local", ...arguments
                ]);
                if (promise) return promise;
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
                let {
                    queue,
                    database,
                    later,
                    remote
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

                    let __ = typeof behaviour;
                    let invalid = __ !== "string";
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
                    __ = typeof parameters;
                    if (__ === "function") {

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
                            __ = typeof queue;
                            if (__ === "function") {

                                queue = queue(...[
                                    ȯptiȯns.name,
                                    behaviour.parameters
                                ]);
                            }
                        }
                    }
                }
                var type = behaviour.constructor[
                    "prototype"
                ].getType();
                if (behaviour.getType() !== type) {

                    debug("Execution type of " +
                        (behaviour.name || "a behaviour") +
                        ", is different from its original" +
                        " type " + type);
                }
                behaviour.getEmitterId = self.getEmitterId;
                behaviour.isCompleted = self.isCompleted;
                behaviour.setOption("database", database);
                if (!queue) queue = queuě;
                if (!later) {

                    let __ = typeof parameters;
                    var mandatory = __ !== "function";
                    mandatory |= callback == parameters;
                    if (mandatory) {

                        self.mandatoryBehaviour = behaviour;
                    }
                }
                if (!FetchBehaviour) {

                    var fetch = "";
                    let __ = typeof options.fetcher;
                    if (__ === "string") {

                        fetch = options.fetcher;
                    } else {

                        __ = typeof fetching;
                        if (__ === "string") {

                            fetch = fetching;
                        } else {

                            __ = typeof options.fetching;
                            if (__ === "string") {

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
                if (self.mandatoryBehaviour !== behaviour) {

                    let _cancel = self.cancel;
                    self.cancel = function () {

                        cancel();
                        if (typeof _cancel === "function") {

                            _cancel();
                        }
                    };
                }
                if (typeof remote !== "function") return;
                let remotes = Object.assign(...[
                    {}, defaultRemotes, config.remotes
                ]);
                Object.keys(remotes).forEach(function (key) {

                    if (/^node_(\d+)$/.test(key)) {

                        self.remote(key).run(...[
                            behaviour.name,
                            behaviour.parameters,
                            function (res, err) {

                                remote(res, err, key);
                            },
                            { database }
                        ]);
                    }
                });
                return self;
            };
            self.runEvery = function () {

                let [
                    behaviour,
                    parameters,
                    callback,
                    opts
                ] = arguments;
                if (!opts) opts = {};
                opts.later = true;
                typeOf = typeof opts.remote;
                if (typeOf !== "function") {

                    opts.remote = (_, err, key) => {

                        if (err) {

                            debug(key + ": " + err);
                        }
                    };
                }
                return self.run(...[
                    behaviour,
                    parameters,
                    callback,
                    opts
                ]);
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
                        var promise = getPromise(...[
                            baseURL, ...arguments
                        ]);
                        if (promise) return promise;
                        if (baseURL === "local") {

                            return self.run(...[
                                behaviour,
                                parameters,
                                callback,
                                opts
                            ]);
                        }
                        let __ = typeof behaviour;
                        var no_name = __ !== "string";
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
                        let remotes, tenants;
                        if (config) {

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

                                key: "Behaviour-Tenant",
                                type: "header",
                                value: tenantID || database
                            };
                        }
                        var remoteURL = Object.assign(...[
                            {},
                            defaultRemotes,
                            remotes
                        ])[baseURL];
                        let behaviours, remote = baseURL;
                        if (remoteURL) baseURL = remoteURL;
                        __ = typeof baseURL;
                        var string_url = __ === "string";
                        if (string_url) {

                            string_url &= baseURL.length > 0;
                        }
                        if (baseURL instanceof Behaviours) {

                            behaviours = baseURL;
                        } else if (string_url) {

                            behaviours = new Behaviours(...[
                                baseURL
                            ]);
                            if (defaultRemotes[remote]) {

                                defaultRemotes[
                                    remote
                                ] = behaviours;
                            } else {

                                __ = typeof remotes;
                                if (__ === "object") {

                                    if (remotes) remotes[
                                        remote
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
                                __ = typeof _cancel;
                                if (__ === "function") {

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

            name: options.name,
            type: types[options.type],
            inputObjects: options.defaults
        });
    }
    return define(getRBConstructor).extend(...[
        BusinessBehaviour
    ]).defaults({

        name: options.name,
        type: types[options.type]
    });
};