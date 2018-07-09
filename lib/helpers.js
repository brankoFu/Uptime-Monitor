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

// Create a random string of given length
helpers.createRandomString = function (length) {
  length = typeof (length) == 'number' ? length : 0;
  if (length) {
     var possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
     var randomString = '';
     for (let i = 0; i < length; i++) {
       var randomChar = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
       randomString += randomChar;
     }
     return randomString;
  } else {
    return false;
  }
}

// Export module
module.exports = helpers;