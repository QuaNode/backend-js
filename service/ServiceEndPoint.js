/*jslint node: true */
'use strict';

var ServiceAdapter = require('./ServiceAdapter.js').ServiceAdapter;
var ServiceObjectMetadata = require('./ServiceResponseMetadata.js').ServiceObjectMetadata;

module.exports.ServiceEndPoint = function (options) {

    var self = this;
    var baseURI = options.baseURI;
    var Adapter = options.Adapter;
    var responseMetadata = options.responseMetadata;
    if (typeof baseURI !== 'string') {

        throw new Error('Invalid URI');
    }
    if (typeof Adapter !== 'function' || !(Adapter.prototype instanceof ServiceAdapter)) {

        throw new Error('Invalid service provider');
    }
    if (responseMetadata && !(responseMetadata instanceof ServiceObjectMetadata)) {

        throw new Error('Invalid response metadata');
    }
    self.responseMetadata = responseMetadata;
    self.adapter = function (param) {

        return new Adapter(baseURI, param);
    };
    self.consumableByAdapter = function (serviceAdapter) {

        return serviceAdapter instanceof Adapter && serviceAdapter.getBaseURI() === baseURI;
    };
};
