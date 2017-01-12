/*jslint node: true */
'use strict';

module.exports.ServiceAuthenticator = function() {

  var self = this;
  self.path = null;
  self.authenticateUser = null;
  self.authenticateRequest = null;
  self.isAuthenticated = null;
};
