/*jslint node: true */
'use strict';

module.exports.ServiceAdapter = function(baseURL) {

  var self = this;
  if (typeof baseURL !== 'string') throw new Error('invalid baseURL');
  self.getBaseURL = function() {

    return baseURL;
  };
  self.authenticator = null;
  self.sendRequest = null;
};
