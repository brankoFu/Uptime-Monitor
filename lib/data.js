/*
 * Library for storing and editing data
 *
 */


// Dependencies
var fs = require('fs');
var path = require('path');

// Container for the module (to be exported)
var lib = {};

// Data base directory
lib.baseDir = path.join(__dirname, '/../.data/');

// Create new file and fill with data
lib.create = function (dir, file, data, callback) {
  var filePath = lib.baseDir + dir + '/' + file + '.json';
  // Open the file for writing
  fs.open(filePath, 'wx', function (err, fileDescriptor) {
    if (!err && fileDescriptor) {
      var stringData = JSON.stringify(data);

      // Write data to file
      fs.writeFile(fileDescriptor, stringData, function () {
        if (!err) {
          fs.close(fileDescriptor, function (err) {
            if (!err) {
              // Success
              callback(false);
            } else {
              callback('Error closing the file');
            }
          });
        } else {
          callback('Error writing to new file');
        }
      });
    } else {
      callback('Could not create new file, it may alerady exist');
    }
  });
};

// Read data from a file
lib.read = function (dir, file, callback) {
  var filePath = lib.baseDir + dir + '/' + file + '.json';
  fs.readFile(filePath, 'utf8', function (err, data) {
    callback(err, data);
  });
};

// Update file content
lib.update = function (dir, file, data, callback) {
  var filePath = lib.baseDir + dir + '/' + file + '.json';
  // Open the file for writing
  fs.open(filePath, 'r+', function (err, fileDescriptor) {
    if (!err && fileDescriptor) {
      var stringData = JSON.stringify(data);
      // Truncate the file
      fs.truncate(fileDescriptor, function (err) {
        if (!err) {
          fs.writeFile(fileDescriptor, stringData, function (err) {
            if (!err) {
              fs.close(fileDescriptor, function (err) {
                if (!err) {
                  callback(false);
                } else {
                  callback('Error closing an existing file')
                }
              });
            } else {
              callback('Error writing to file');
            }
          });
        } else {
          callback('Error truncating the file');
        }
      });
    } else {
      callback('Could not open the file for updating, it may not exist yet')
    }
  });
}

// Delete existing file
lib.delete = function (dir, file, callback) {
  var filePath = lib.baseDir + dir + '/' + file + '.json';
  // Unlink the file
  fs.unlink(filePath, function (err) {
    if (!err) {
      callback(false);
    } else {
      callback(err);
    }
  });
};

// Export the module
module.exports = lib;