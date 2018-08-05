/*
 * Library for storing and rotating logs
 *
 */

// Dependencies
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');

// Container for the module
var lib = {};

// Base directory for logs folder
lib.baseDir = path.join(__dirname, '../.logs/');

// Append the string to file, or create new file if it does not exist
lib.append = function(fileName, str, callback) {
  // Open the file for appending
  fs.open(lib.baseDir + fileName + '.log', 'a', function(err, fileDescriptor) {
    if (!err && fileDescriptor) {
      // Append to file and close it
      fs.appendFile(fileDescriptor, str + '\n', function(err) {
        if (!err) {
          fs.close(fileDescriptor, function(err) {
            if (!err) {
              callback(false);
            } else {
              callback('Error while closing the file that was being appended');
            }
          });
        } else {
          callback('Error appending to file');
        }
      });
    } else {
      callback('Could not open file for appending');
    }
  });
};

// List all the logs, and optionally include the compressed logs
lib.list = function(includeCompressedLogs, callback) {
  fs.readdir(lib.baseDir, function (err, data) {
    if (!err && data && data.length > 0) {
      var trimmedFileNames = [];
      data.forEach(function (fileName) {
        // Add the .log files
        if (fileName.indexOf('.log') > -1) {
          trimmedFileNames.push(fileName.replace('.log', ''));
        } 
        // Add the .gz files
        if (fileName.indexOf('.gz.b64') > -1 && includeCompressedLogs) {
          trimmedFileNames.push(fileName.replace('.gz.b64', ''));
        }
      });
      callback(false, trimmedFileNames);
    } else {
      callback(err, data);
    }
  });
};

// Compress the contents of one .log file into a .gz.b64 file within the same directory 
lib.compress = function(logId, newFileId, callback) {
  var sourceFile = logId + '.log';
  var destinationFIle = newFileId + '.gz.b64';

  // Read the source file
  fs.readFile(lib.baseDir + sourceFile, 'utf8', function (err, inputString) {
    if (!err && inputString) {
      // Compress the data using gzip
      zlib.gzip(inputString, function (err, buffer) {
        if (!err && buffer) {
          // Send the data to the destination file
          fs.open(lib.baseDir + destinationFIle, 'wx', function (err, fileDescriptor) {
            if (!err && fileDescriptor) {
              fs.writeFile(fileDescriptor, buffer.toString('base64'), function (err) {
                if (!err) {
                  fs.close(fileDescriptor, function (err) {
                    if (!err) {
                      callback(false);
                    } else {
                      callback(err);
                    }
                  })
                } else {
                  callback(err);
                }
              });
            } else {
              callback(err);
            }
          });
        } else {
          callback(err);
        }
      });
    } else {
      callback(err);
    }
  });
};

// Decompress the content of a .gz.b64 file into a string varifable
lib.decompress = function (fileId, callback) {
  var fileName = fileId + '.gz.b64';
  fs.readFile(lib.baseDir + fileName, 'utd8', function (err, str) {
    // Decompress the data
    var inputBuffer = Buffer.from(str, 'base64');
    zlib.unzip(inputBuffer, function (err, outputBuffer) {
      if (!err && outputBuffer) {
        var str = outputBuffer.toString();
        callback(false, str);
      } else {
        callback(err);
      }
    });
  });
};

// Truncating a log file
lib.truncate = function(logId, callback) {
  fs.truncate(lib.baseDir + logId + '.log', 0, function (err) {
    if (!err) {
      callback(false);
    } else {
      callback(err);
    }
  });
};

// Export the module
module.exports = lib;
 