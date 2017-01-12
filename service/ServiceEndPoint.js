/*jslint node: true */
'use strict';

var ServiceAdapter = require('./ServiceAdapter.js').ServiceAdapter;
var ServiceObjectMetadata = require('./ServiceResponseMetadata.js').ServiceObjectMetadata;
var ServiceAttributeMetadata = require('./ServiceResponseMetadata.js').ServiceAttributeMetadata;

module.exports.ServiceEndPoint = function(options) {

    var self = this;
    var baseURL = options.baseURL;
    var Adapter = options.Adapter;
    var responseMetadata = options.responseMetadata;
    var modelAttributes = options.modelAttributes;
    var serviceAttributes = options.serviceAttributes;
    if (typeof baseURL !== 'string') {

        throw new Error('invalid URL');
    }
    if (typeof Adapter !== 'function' || !(Adapter.prototype instanceof ServiceAdapter)) {

        throw new Error('invalid service provider');
    }
    if (responseMetadata && !(responseMetadata instanceof ServiceObjectMetadata)) {

        throw new Error('invalid response metadata');
    }
    self.adapter = function(param) {

        return new Adapter(baseURL, param);
    };
    self.consumableByAdapter = function(serviceAdapter) {

        return serviceAdapter instanceof ServiceAdapter && serviceAdapter instanceof Adapter && serviceAdapter.getBaseURL() === baseURL;
    };
    if (responseMetadata) {

        self.responseMetadata = responseMetadata;
        if (Array.isArray(modelAttributes) && Array.isArray(serviceAttributes)) {

            if (modelAttributes.length !== serviceAttributes.length) throw new Error('invalid attributes count');
            self.responseMetadata.attributes = [];
            for (var i = 0; i < modelAttributes.length; i++) {

                var attribute = new ServiceAttributeMetadata({

                    model: modelAttributes[i],
                    name: serviceAttributes[i],
                });
                self.responseMetadata.attributes.push(attribute);
            }
        }
    }
};
