/*
 * Helper methods
 * 
 */

// Dependencies
var crypto = require('crypto');
var config = require('./config');
var querystring = require('querystring');
var https = require('https');

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

// Send SMS via Twilio API
helpers.sendTwilioSms = function (phone, message, callback) {
  // Validate parameters
  var phone = typeof (phone) == 'string' && phone.trim().length > 0 ? phone : false;
  var message = typeof (message) == 'string' && message.trim().length > 0 && message.trim().length < 1600 ? message.trim() : false;
  console.log(phone + ' ' + message);
  if (phone && message) {
    // Configure the request payload
    var payload = {
      From: config.twilio.fromPhone,
      To: phone,
      Body: message
    };

    var stringPayload = querystring.stringify(payload);

    // Configure request details
    var requestDetails = {
      protocol: 'https:',
      hostname: 'api.twilio.com',
      method: 'POST',
      path: '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
      auth: config.twilio.accountSid + ':' + config.twilio.authToken,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload)
      }
    };

    // Instantiate request object
    var req = https.request(requestDetails, function (res) {
      var status = res.statusCode;
      if (status == 200 || status == 201) {
        callback(false); // No error
      } else {
        callback('Status code returned ' + status); 
      }
    });

    // Bind to the error event so it doesn't get thrown
    req.on('error', function (err) {
      callback(err);
    });

    // Add the payload
    req.write(stringPayload);

    // End the request
    req.end();

  } else {
    callback('Given parameters were missing or invalid');
  }
};

// Export module
module.exports = helpers;