/*jslint node: true */
'use strict';

module.exports.ServiceAdapter = function(baseURI) {

  var self = this;
  if (typeof baseURI !== 'string') throw new Error('Invalid base URI');
  self.getBaseURI = function() {

    return baseURI;
  };
  self.authenticator = null;
  self.sendRequest = null;
};
