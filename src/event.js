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
        defaultRemotes,
        FetchBehaviours,
        getEmitters
    ] = arguments;
    var getEBConstructor = function (init) {

        return function () {

            var self = init.apply(...[
                this,
                arguments
            ]).self();
            var [_, getEmitterId] = arguments;
            if (!getEmitterId) {

                getEmitterId = function () { };
            }
            var emit = function () {

                let [
                    emitter,
                    room,
                    behaviour,
                    response,
                    forceReceive
                ] = arguments;
                if (!forceReceive) {

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
                    forceReceive
                ] = arguments;
                var room = event;
                if (room && typeof room === "object") {

                    room = JSON.stringify(room);
                }
                if (typeof room !== "string") {

                    throw new Error("Invalid event");
                }
                var queue = options.queue;
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
                        queue: behaviour_queue
                    } = behaviour;
                    if (typeof behaviour.queue === "function") {

                        behaviour_queue = behaviour.queue(...[
                            behaviour.name,
                            parameters
                        ]);
                    }
                    if (behaviour_queue == queue) {

                        throw new Error("Queue of event " +
                            "behaviour should be different " +
                            "from the queue of triggering " +
                            "behaviour");
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
                            var response = {

                                behaviour: behaviour.name,
                                version: behaviour.version,
                                emitter_id: getEmitterId(...[
                                    behaviour.name,
                                    room
                                ])
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
                                                forceReceive
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
                                forceReceive
                            ]);
                        },
                        behaviour_queue
                    ]);
                });
            };
        };
    };
    return define(getEBConstructor).extend(getRemoteBehaviour(...[
        options,
        config,
        types,
        BEHAVIOURS,
        defaultRemotes,
        FetchBehaviours
    ])).defaults({

        type: types[options.type]
    });
};
