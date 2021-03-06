/*
 * Worker-related tasks
 * 
 */

// Dependencies
var path = require('path');
var fs = require('fs');
var _data = require('./data');
var https = require('https');
var http = require('http');
var helpers = require('./helpers');
var url = require('url');
var _logs = require('./logs');
var util = require('util');
var debug = util.debuglog('workers');

// Instantiate the worker object
var workers = {};

// Lookup all checks, get their data, send to validator
workers.gatherAllChecks = function () {
  // Get all checks
  _data.list('checks', function (err, checks) {
    if (!err && checks && checks.length > 0) {
      checks.forEach(function (check) {
        // Read check data
        _data.read('checks', check, function (err, originalCheckData) {
          if (!err && originalCheckData) {
            // Pass it to check validator
            workers.validateCheckData(originalCheckData);
          } else {
            debug.log('Error: Could not read check data');
          }
        });
      });
    } else {
      debug.log('Error: Could not find any checks to process')
    }
  });
};

// Sanity-check the check-data
workers.validateCheckData = function (checkData) {
  checkData = typeof (checkData) == 'object' && checkData !== null ? checkData : {};
  checkData.id = typeof (checkData.id) == 'string' && checkData.id.trim().length == 20 ? checkData.id.trim() : false;
  checkData.userPhone = typeof (checkData.userPhone) == 'string' && checkData.userPhone.trim().length > 0 ? checkData.userPhone.trim() : false;
  checkData.protocol = typeof (checkData.protocol) == 'string' && ['https', 'http'].indexOf(checkData.protocol) > -1 ? checkData.protocol : false;
  checkData.url = typeof (checkData.url) == 'string' && checkData.url.trim().length > 0 ? checkData.url.trim() : false;
  checkData.method = typeof (checkData.method) == 'string' && ['get', 'post', 'put', 'delete'].indexOf(checkData.method) > -1 ? checkData.method : false;
  checkData.successCodes = typeof (checkData.successCodes) == 'object' && checkData.successCodes instanceof Array && checkData.successCodes.length > 0 ? checkData.successCodes : false;
  checkData.timeoutSeconds = typeof (checkData.timeoutSeconds) == 'number' && checkData.timeoutSeconds % 1 === 0 && checkData.timeoutSeconds >= 1 && checkData.timeoutSeconds <= 5 ? checkData.timeoutSeconds : false;

  // Set flag keys
  checkData.state = typeof (checkData.state) == 'string' && ['up', 'down'].indexOf(checkData.state) > -1 ? checkData.state : 'down';
  checkData.lastChecked = typeof (checkData.lastChecked) == 'number' && checkData.lastChecked > 0 ? checkData.lastChecked : false;

  // If all the checks pass, pass the data along to the next step in the process
  if (checkData.id &&
    checkData.userPhone &&
    checkData.protocol &&
    checkData.url &&
    checkData.method &&
    checkData.successCodes &&
    checkData.timeoutSeconds) {
    workers.performCheck(checkData);
  } else {
    debug.log('Error: One of the checks is not properly formatted');
  }
};

// Perform the check, send the checkData and the outcome of the check process to the next step
workers.performCheck = function (checkData) {
  // Prepare the initial check outcome
  var checkOutcome = {
    error: false,
    responseCode: false
  };

  // Mark that the outcome has not been seen yet
  var outcomeSent = false;

  // Parse the hostname and the path out of the original check data
  var parsedUrl = url.parse(checkData.protocol + '://' + checkData.url, true);
  var hostName = parsedUrl.hostname;
  var path = parsedUrl.path;

  // Construct the request
  var requestDetails = {
    protocol: checkData.protocol + ':',
    hostname: hostName,
    method: checkData.method.toUpperCase(),
    path: path,
    timeout: checkData.timeoutSeconds * 1000
  };

  // Instantiate the request object using http or https
  var _moduleToUse = checkData.protocol == 'http' ? http : https;
  var req = _moduleToUse.request(requestDetails, function (res) {
    var status = res.statusCode;

    // Update the check outcome and pass data along
    checkOutcome.responseCode = status;
    if (!outcomeSent) {
      workers.processCheckOutcome(checkData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the error event so it doesn't get thrown
  req.on('error', function (err) {
    // Update the check outcome and pass data along
    checkOutcome.error = {
      error: true,
      value: err
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(checkData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the error event so it doesn't get thrown
  req.on('timeout', function (err) {
    // Update the check outcome and pass data along
    checkOutcome.error = {
      error: true,
      value: 'timeout'
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(checkData, checkOutcome);
      outcomeSent = true;
    }
  });

  // End the request
  req.end();
};

// Process the check outcome, update the check data as needed, trigger an alert if needed
// Special logic for accomodating a check that has never been tested before (don't alert on that)
workers.processCheckOutcome = function (checkData, checkOutcome) {

  // Decide if the check is up or down
  var state = !checkOutcome.error && checkOutcome.responseCode && checkData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

  // Decide if an alert is warranted
  var alertWarranted = checkData.lastChecked && checkData.state !== state ? true : false;

  // Log the outcome
  var timeOfCheck = Date.now();
  workers.log(checkData, checkOutcome, state, alertWarranted, timeOfCheck);

  // Update the check data
  var newCheckData = checkData;
  newCheckData.state = state;
  newCheckData.lastChecked = timeOfCheck;

  // Save the updates
  _data.update('checks', newCheckData.id, newCheckData, function (err) {
    // Alert to user if needed
    if (alertWarranted) {
      workers.alertUserToStatusChange(newCheckData);
    } else {
      debug('Check outcome has not changed, no alert needed');
    }
  });
};

// Alert the user as to a change in their check status
workers.alertUserToStatusChange = function (checkData) {
  var message = 'Alert: Your check for ' + checkData.method + ' ' + checkData.protocol + '://' + checkData.url + ' is currently ' + checkData.state;
  helpers.sendTwilioSms(checkData.userPhone, message, function (err) {
    if (!err) {
      debug('Success: User was alerted to a status change via sms');
    } else {
      debug('Error: Could not send sms to user');
    }
  });
};

// Log to file
workers.log = function (checkData, checkOutcome, state, alertWarranted, timeOfCheck) {
  // Form the log data
  var logData = {
    check: checkData,
    outcome: checkOutcome,
    state: state,
    alert: alertWarranted,
    time: timeOfCheck
  };

  // Convert data to string
  var logString = JSON.stringify(logData);

  // Determine the name of the log file
  var logFileName = checkData.id;

  // Append log string to file
  _logs.append(logFileName, logString, function (err) {
    if (!err) {
      debug('Logging to file succeeded');
    } else {
      debug('Logging to file failed');
    }
  });
};

// Timer to execute the worker-process once per minute
workers.loop = function () {
  setInterval(function () {
    workers.gatherAllChecks();
  }, 1000 * 60);
};

// Rotate (compress) the log files
workers.rotateLogs = function () {
  // List all the non compressed log files
  _logs.list(false, function (err, logs) {
    if (!err && logs && logs.length > 0) {
      logs.forEach(function (logName) {
        // Compress data to a different file
        var logId = logName.replace('.log', '');
        var newFileId = logId + '-' + Date.now();
        _logs.compress(logId, newFileId, function (err) {
          if (!err) {
            // Truncate the log
            _logs.truncate(logId, function (err) {
              if (!err) {
                debug('Success truncating log file');
              } else {
                debug('Error truncating log file');
              }
            });
          } else {
            debug('Error compressing one of the log files', err);
          }
        });
      });
    } else {
      debug('Error: could not find any logs to rotate');
    }
  });
};

// Timer to exeute the logRotation proccess once per day
workers.logRotationLoop = function () {
  setInterval(function () {
    workers.rotateLogs();
  }, 1000 * 60 * 60 * 24);
};


// Init function
workers.init = function () {
  // Send to console, in yellow
  console.log('\x1b[33m%s\x1b[0m','Background workers are running');

  // Execute all the checks immediately
  workers.gatherAllChecks();

  // Call the loop so the checks will execute later on
  workers.loop();

  // Compress all the logs immediately
  workers.rotateLogs();

  // Call the compression loop
  workers.logRotationLoop();
};

// Export the module
module.exports = workers;