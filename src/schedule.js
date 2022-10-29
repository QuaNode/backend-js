/*jslint node: true */
/*jshint esversion: 6 */
"use strict";

var parser = require("cron-parser");
var {
    businessController
} = require("./controller.js");

module.exports.scheduleBehaviour = function () {

    var [
        options,
        BehaviourConstructor,
        types,
        FetchBehaviours
    ] = arguments;
    var seconds = new Date().getTime() / 1000;
    seconds = Math.floor(seconds);
    var { schedule } = options;
    var next;
    if (typeof schedule === "function") {

        next = schedule;
    } else if (schedule > 0) next = function () {

        var time = new Date().getTime() / 1000;
        time = Math.floor(time);
        var diff = time - seconds;
        if (diff > 0 && diff % schedule === 0) {

            seconds = time;
            return true;
        }
        return false;
    }; else {

        var _time;
        var _next = function () {

            var time = new Date().getTime() / 1000;
            time = Math.floor(time);
            var close = time >= _time;
            var fired = seconds >= _time;
            if (close && !fired) {

                seconds = time;
                _time = parser.parseExpression(...[
                    schedule
                ]).next().getTime() / 1000;
                _time = Math.floor(_time);
                return true;
            }
            return false;
        };
        var cron = typeof schedule === "string";
        if (cron) {

            cron &= schedule.length > 0;
        }
        if (cron) try {

            _time = parser.parseExpression(...[
                schedule
            ]).next().getTime() / 1000;
            _time = Math.floor(_time);
            next = _next;
        } catch (_) { }
    }
    if (next) {

        setInterval(function () {

            if (!next()) return;
            var behaviour = new BehaviourConstructor({

                name: options.name,
                type: types[options.type],
                priority: options.priority || 0,
                timeout: options.timeout,
                inputObjects: {}
            });
            var fetching = "";
            if (typeof options.fetching === "string") {

                fetching = options.fetching;
            }
            var FetchBehaviour = FetchBehaviours[
                fetching
            ];
            if (options.fetcher) {

                FetchBehaviour = BehaviourConstructor;
            }
            let { queue } = options;
            if (typeof queue === "function") {

                queue = queue(options.name, {});
            }
            businessController(...[
                options.name,
                queue,
                options.database,
                options.storage,
                options.fetcher || options.fetching,
                FetchBehaviour,
                options.memory,
                options.operations
            ]).runBehaviour(behaviour);
        }, 1000);
    }
};