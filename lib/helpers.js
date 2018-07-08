/*
 * Helper methods
 * 
 */

// Dependencies
var crypto = require('crypto');
var config = require('./config');

// Create container
var helpers = {};

// Hash method
helpers.hash = function (str) {
  if (typeof (str) == 'string') {
    var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    return hash;
  } else {
    return false;
  }
}

// JSON to Object
helpers.parseJsonToObject = function (str) {
  try {
    var obj = JSON.parse(str);
    return obj;
  } catch (e) {
    return {};
  }
}

// Export module
module.exports = helpers;