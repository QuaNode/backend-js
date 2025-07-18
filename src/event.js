/*jslint node: true */
/*jshint esversion: 6 */
"use strict";

var {
    Namespace
} = require("socket.io");
var debug = require("debug");
var define = require("define-js");
var {
    getRemoteBehaviour
} = require("./remote.js");

debug.enable("backend:*");
debug = debug("backend:event");

module.exports.getEventBehaviour = function () {

    var [
        options,
        config,
        types,
        BEHAVIOURS,
        defaultTenants,
        defaultRemotes,
        FetchBehaviours,
        getEmitters
    ] = arguments;
    var getEBConstructor = function (init) {

        return function () {

            var [
                ȯptions, getEmitterId, getDatabase
            ] = arguments;
            if (!ȯptions) ȯptions = {};
            var self = init.apply(...[
                this,
                arguments
            ]).self();
            self.getEmitterId = getEmitterId;
            if (!self.getEmitterId) {

                self.getEmitterId = () => { };
            }
            var typeOf = typeof getDatabase;
            if (typeOf !== "function") {

                getDatabase = function () {

                    return ȯptions.database;
                };
            }
            var emit = function () {

                let [
                    emitter,
                    room,
                    behaviour,
                    response,
                    retry
                ] = arguments;
                if (!retry) {

                    emitter = emitter.volatile;
                }
                emitter.to(room).emit(...[
                    behaviour,
                    response
                ]);
            };
            self.trigger = function () {

                let [
                    event,
                    parameters,
                    retry = true,
                    later
                ] = arguments;
                var room = event;
                if (room && typeof room === "object") {

                    room = JSON.stringify(room);
                }
                if (typeof room !== "string") {

                    throw new Error("Invalid event");
                }
                if (getDatabase()) {

                    var tenants = Object.assign(...[
                        {},
                        defaultTenants,
                        config.tenants
                    ]);
                    var databases = Object.keys(...[
                        tenants
                    ]).sort();
                    var tenant = databases.indexOf(...[
                        getDatabase()
                    ])
                    room = JSON.stringify({

                        tenant,
                        event: room
                    });
                }
                var { controller: self_queue } = self;
                var queue = self_queue || options.queue;
                if (typeof options.queue === "function") {

                    queue = options.queue(...[
                        options.name,
                        self.parameters
                    ]);
                }
                var emitters = getEmitters(room);
                if (emitters) Object.keys(...[
                    emitters
                ]).forEach(function (behaviour_name) {

                    var behaviour = BEHAVIOURS[
                        behaviour_name
                    ].options;
                    var {
                        queue: behaviour_queue,
                        database
                    } = behaviour;
                    if (typeof behaviour.queue === "function") {

                        behaviour_queue = behaviour.queue(...[
                            behaviour.name,
                            parameters
                        ]);
                    }
                    var ëmitters = emitters[behaviour.name];
                    var emitting = Array.isArray(ëmitters);
                    if (emitting) {

                        emitting &= ëmitters.length > 0;
                    }
                    if (emitting) self.run(...[
                        behaviour.name,
                        parameters,
                        function () {

                            let [
                                result,
                                error
                            ] = arguments;
                            var {
                                businessOperations: bOps
                            } = self.state;
                            var me_finished = bOps.length === 0;
                            me_finished &= !later;
                            var no_queue = !me_finished;
                            no_queue &= !behaviour_queue;
                            if (no_queue) {

                                throw new Error("Queue of " +
                                    "event behaviour should" +
                                    " be provided or " +
                                    "constructed from " +
                                    "parameters");
                            }
                            var enqueue = !me_finished;
                            enqueue &= behaviour_queue == queue;
                            if (enqueue) {

                                throw new Error("Queue of " +
                                    "event behaviour should" +
                                    " be different from the" +
                                    " queue of triggering " +
                                    "behaviour");
                            }
                            var response = {

                                behaviour: behaviour.name,
                                version: behaviour.version,
                                emitter_id: self[
                                    "getEmitterId"
                                ](behaviour.name, room)
                            };
                            var failing = false;
                            if (typeof error === "object") {

                                failing = true;
                            }
                            if (typeof result !== "object") {

                                failing |= true;
                            }
                            if (failing) {

                                debug(error);
                                if (error) {

                                    let { message } = error;
                                    response.message = message;
                                } else {

                                    response.message = "Error" +
                                        " while executing " +
                                        behaviour.name +
                                        " behaviour, version " +
                                        behaviour.version + "!";
                                }
                            } else {

                                response.response = result;
                                if (behaviour.paginate) {

                                    let {
                                        modelObjects: page
                                    } = result;
                                    if (page) {

                                        response.response = page;
                                    }
                                }
                                if (behaviour.paginate) {

                                    let {
                                        pageCount: page
                                    } = result;
                                    response.has_more = false;
                                    if (page > parameters.page) {

                                        response.has_more = true;
                                    }
                                }
                                var { returns } = behaviour;
                                if (typeof returns === "function") {

                                    returns(...[
                                        ëmitters.reduce(function () {

                                            let [reqs, e] = arguments;
                                            if (e instanceof Namespace) {

                                                let { sockets } = e;
                                                sockets = sockets.values();
                                                reqs = [
                                                    ...reqs,
                                                    ...sockets.map(...[
                                                        function () {

                                                            let [{
                                                                request
                                                            }] = arguments;
                                                            return request;
                                                        }
                                                    ])
                                                ];
                                            }
                                            return reqs;
                                        }, []),
                                        ëmitters,
                                        result,
                                        error,
                                        function (outputObjects) {

                                            emit(...[
                                                ëmitters[0],
                                                room,
                                                behaviour.name,
                                                outputObjects,
                                                retry
                                            ]);
                                        }
                                    ]);
                                    return;
                                }
                            }
                            emit(...[
                                ëmitters[0],
                                room,
                                behaviour.name,
                                response,
                                retry
                            ]);
                        },
                        {
                            queue: behaviour_queue,
                            database: database() || getDatabase(),
                            later
                        }
                    ]);
                });
            };
            self.triggerLater = function () {

                let [
                    event,
                    parameters,
                    retry = true
                ] = arguments;
                self.trigger(...[
                    event,
                    parameters,
                    retry,
                    true
                ]);
            };
            self.tryTrigger = function () {

                let [
                    event,
                    parameters
                ] = arguments;
                self.trigger(...[
                    event,
                    parameters,
                    false
                ]);
            };
        };
    };
    return define(getEBConstructor).extend(getRemoteBehaviour(...[
        options,
        config,
        types,
        BEHAVIOURS,
        defaultTenants,
        defaultRemotes,
        FetchBehaviours
    ])).defaults({

        type: types[options.type]
    });
};
