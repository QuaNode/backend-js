/*jslint node: true */
/*jshint esversion: 6 */
"use strict";

var resourceControllers = {};

module.exports.setResourceController = function () {

    let [rc, key] = arguments;
    if (key && typeof key !== "string") {

        throw new Error("Invalid resource" +
            " controller key");
    }
    if (typeof rc !== "object") {

        throw new Error("Invalid resource" +
            " controller");
    }
    if (typeof rc.loadResource !== "function") {

        throw new Error("Missing loadResource" +
            " method in resource controller");
    }
    resourceControllers[key || "local"] = rc;
};

module.exports.getResourceController = function () {

    let [key] = arguments;
    return resourceControllers[key || "local"];
};
