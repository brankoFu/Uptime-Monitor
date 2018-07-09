/*
 * Request handlers
 * 
 */

// Dependencies
var helpers = require('./helpers');
var config = require('./config');

// Define the handlers
var handlers = {};
var _data = require('./data');

// Ping handler
handlers.ping = function (data, callback) {
  callback(200);
};

// Users handler
handlers.users = function (data, callback) {
  var acceptableMethods = ['get', 'post', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for users submethods
handlers._users = {};

// Users - get
// Required data: phone
// Optional data: none
handlers._users.get = function (data, callback) {
  var phone = typeof (data.query.phone) == 'string' ? data.query.phone.trim() : false;
  if (phone) {
    // Get the token from headers
    var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
    // Verify token 
    handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
      if (tokenIsValid) {
        // Lookup the user 
        _data.read('users', phone, function (err, data) {
          if (!err && data) {
            delete data.password;
            callback(200, data);
          } else {
            callback(404, { Error: 'User not found' });
          }
        });
      } else {
        callback(403, { Error: 'Missing reuqired token, or token is invalid' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = function (data, callback) {
  // Check that all required fields are filled out
  var firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  var lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  var phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length > 0 ? data.payload.phone : false;
  var password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  var tosAgreement = typeof (data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

  if (firstName && lastName && phone && password && tosAgreement) {
    _data.read('users', phone, function (err, data) {
      if (err) {
        // add new user
        var hashedPassword = helpers.hash(password);

        if (hashedPassword) {
          var userObject = {
            firstName,
            lastName,
            phone,
            password: hashedPassword,
            tosAgreement: true
          };

          _data.create('users', phone, userObject, function (err) {
            if (!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500, { Error: 'Could not create new user' })
            }
          });
        } else {
          callback(500, { Error: 'Could not hash user password' });
        }


      } else {
        callback(400, { Error: 'User with that phone number already exists' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required fields' });
  }
};

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
handlers._users.put = function (data, callback) {
  // Check for the required field
  var phone = typeof (data.query.phone) == 'string' ? data.query.phone.trim() : false;
  if (phone) {
    // Check for the optional fields
    var firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if (firstName || lastName || password) {
      // Get the token from headers
      var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

      handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
        if (tokenIsValid) {
          // Lookup the user
          _data.read('users', phone, function (err, userData) {
            if (!err && userData) {
              userData.firstName = firstName ? firstName : userData.firstName;
              userData.lastName = lastName ? lastName : userData.lastName;
              userData.password = password ? helpers.hash(password) : userData.password;

              // Store updated user
              _data.update('users', phone, userData, function (err) {
                if (!err) {
                  callback(200);
                } else {
                  console.log(err);
                  callback(500, { Error: 'Could not update user data' });
                }
              });
            } else {
              callback(404, { Error: 'User not found' });
            }
          });
        } else {
          callback(403, { Error: 'Missing reuqired token, or token is invalid' });
        }
      });
    } else {
      callback(400, { Error: 'Missing fields to update' });
    }
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Users - delete
// Required data: phone
handlers._users.delete = function (data, callback) {
  var phone = typeof (data.query.phone) == 'string' ? data.query.phone.trim() : false;
  if (phone) {
    // Get the token from headers
    var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

    handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
      if (tokenIsValid) {
        // Lookup the user 
        _data.read('users', phone, function (err, userData) {
          if (!err && userData) {
            _data.delete('users', phone, function (err) {
              if (!err) {
                // Delete associated checks
                var userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                var checksToDelete = userChecks.length;
                if (checksToDelete > 0) {
                  var checksDeleted = 0;
                  var deletionErrors = false;
                  // Loop through checks
                  userChecks.forEach(function (checkId) {
                    // Delete the check
                    _data.delete('checks', checkId, function (err) {
                      if (!err) {
                        checksDeleted++;
                        if (checksDeleted == checksToDelete) {
                          if (!deletionErrors) {
                            callback(200);
                          } else {
                            callback(500, { Error: 'Could not delete all checks for deleted user' });
                          }
                        }
                      } else {
                        deletionErrors = true;
                      }
                    });
                  });
                } else {
                  callback(200);
                }
              } else {
                callback(500, { Error: 'Could not delete user' });
              }
            });
          } else {
            callback(404, { Error: 'User not found' });
          }
        });
      } else {
        callback(403, { Error: 'Missing reuqired token, or token is invalid' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Tokens handler
handlers.tokens = function (data, callback) {
  var acceptableMethods = ['get', 'post', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for tokens submethods
handlers._tokens = {};

// Tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = function (data, callback) {
  var phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length > 0 ? data.payload.phone : false;
  var password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  if (phone && password) {
    _data.read('users', phone, function (err, userData) {
      if (!err && data) {
        var hashedPassword = helpers.hash(password);
        if (hashedPassword == userData.password) {
          // Create new token with random name, and set expiration after 1 hour
          var tokenId = helpers.createRandomString(20);
          var expires = Date.now() + 1000 * 60 * 60;
          var token = {
            phone,
            expires,
            id: tokenId,
          };

          _data.create('tokens', tokenId, token, function (err) {
            if (!err) {
              callback(200, token);
            } else {
              callback(500, { Error: 'Could not create token' });
            }
          });
        } else {
          callback(400, { Error: 'Incorrect password' });
        }
      } else {
        callback(404, { Error: 'User not found' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required fields' });
  }
};

// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = function (data, callback) {
  var id = typeof (data.query.id) == 'string' ? data.query.id.trim() : false;
  if (id) {
    // Lookup the token 
    _data.read('tokens', id, function (err, tokenData) {
      if (!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404, { Error: 'Token not found' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = function (data, callback) {
  var id = typeof (data.payload.id) == 'string' && data.payload.id.trim().length > 0 ? data.payload.id : false;
  var extend = typeof (data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
  if (id && extend) {
    _data.read('tokens', id, function (err, tokenData) {
      if (!err && tokenData) {
        // Only extend if token hasn't expired
        if (tokenData.expires > Date.now()) {
          tokenData.expires = Date.now() + 1000 * 60 * 60;

          _data.update('tokens', id, tokenData, function (err) {
            if (!err) {
              callback(200);
            } else {
              callback(500, { Error: 'Could not update the token' });
            }
          });
        } else {
          callback(400, { Error: 'Token has already expired' });
        }
      } else {
        callback(404, { Error: 'Token does not exist' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field(s)' });
  }
};

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = function (data, callback) {
  var id = typeof (data.query.id) == 'string' ? data.query.id.trim() : false;
  if (id) {
    // Lookup the user 
    _data.read('tokens', id, function (err, data) {
      if (!err && data) {
        _data.delete('tokens', id, function (err) {
          if (!err) {
            callback(200);
          } else {
            callback(500, { Error: 'Could not delete token' });
          }
        });
      } else {
        callback(404, { Error: 'User not found' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function (id, phone, callback) {
  // Lookup the token
  _data.read('tokens', id, function (err, tokenData) {
    if (!err && tokenData) {
      // Check token
      if (tokenData.phone == phone && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

// Checks handler
handlers.checks = function (data, callback) {
  var acceptableMethods = ['get', 'post', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for checks submethods
handlers._checks = {};

// Checks - POST
// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none
handlers._checks.post = function (data, callback) {
  // Validate inputs
  var protocol = typeof (data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  var url = typeof (data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url : false;
  var method = typeof (data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  var successCodes = typeof (data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  var timeoutSeconds = typeof (data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  if (protocol && url && method && successCodes && timeoutSeconds) {
    // Get the token from headers
    var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

    // Lookup the user by token id
    _data.read('tokens', token, function (err, tokenData) {
      if (!err && tokenData) {
        var userPhone = tokenData.phone;

        _data.read('users', userPhone, function (err, userData) {
          if (!err && userData) {
            var userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

            // Verify number of checks for current user
            if (userChecks.length < config.maxChecks) {
              // Create random id for the check
              var checkId = helpers.createRandomString(20);

              // Create check object
              var checkObject = {
                userPhone,
                protocol,
                method,
                url,
                successCodes,
                timeoutSeconds,
                id: checkId,
              };

              // Save the object
              _data.create('checks', checkId, checkObject, function (err) {
                if (!err) {
                  // Add checkId to user object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);

                  // Save new user data
                  _data.update('users', userPhone, userData, function (err) {
                    if (!err) {
                      callback(200, checkObject);
                    } else {
                      callback(500, { Error: 'Could not update user data' });
                    }
                  });
                } else {
                  callback(500, { Error: 'Could not create new check' });
                }
              });
            } else {
              callback(400, { Error: 'The user already has the maximum number of checks (' + config.maxChecks + ')' });
            }
          } else {
            callback(404, { Error: 'User not found' });
          }
        });
      } else {
        callback(403, { Error: 'Invalid token' });
      }
    });

  } else {
    callback(400, { Error: 'Missing required inputs, or inputs invalid' });
  }
}

// Checks - GET
// Required data: id
// Optional data: none
handlers._checks.get = function (data, callback) {
  var id = typeof (data.query.id) == 'string' && data.query.id.trim().length == 20 ? data.query.id.trim() : false;
  if (id) {
    // Lookup the check
    _data.read('checks', id, function (err, checkData) {
      if (!err && checkData) {
        // Get the token from headers
        var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
        // Verify token 
        handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
          if (tokenIsValid) {
            // Return the check data
            callback(200, checkData);
          } else {
            callback(403, { Error: 'Missing reuqired token, or token is invalid' });
          }
        });
      } else {
        callback(404, { Error: 'Check not found' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field' });
  }
}

// Checks - PUT
// Required data: id
// Optional data: protocol, url, method, successCode, timeoutSeconds (one must be set)
handlers._checks.put = function (data, callback) {
  // Check for the required field
  var id = typeof (data.query.id) == 'string' && data.query.id.trim().length == 20 ? data.query.id.trim() : false;
  if (id) {
    // Check for the optional fields
    var protocol = typeof (data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    var url = typeof (data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url : false;
    var method = typeof (data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    var successCodes = typeof (data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    var timeoutSeconds = typeof (data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if (protocol || url || method || successCodes || timeoutSeconds) {
      // Lookup the check
      _data.read('checks', id, function (err, checkData) {
        if (!err && checkData) {
          // Get the token from headers
          var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
          handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
            if (tokenIsValid) {
              // Update check data
              checkData.protocol = protocol ? protocol : checkData.protocol;
              checkData.method = method ? method : checkData.method;
              checkData.url = url ? url : checkData.url;
              checkData.successCodes = successCodes ? successCodes : checkData.successCodes;
              checkData.timeoutSeconds = timeoutSeconds ? timeoutSeconds : checkData.timeoutSeconds;

              // Store updated check
              _data.update('checks', id, checkData, function (err) {
                if (!err) {
                  callback(200);
                } else {
                  console.log(err);
                  callback(500, { Error: 'Could not update check data' });
                }
              });
            } else {
              callback(403, { Error: 'Missing reuqired token, or token is invalid' });
            }
          });
        } else {
          callback(404, { Error: 'Check not found' });
        }
      });
    } else {
      callback(400, { Error: 'Missing fields to update' });
    }
  } else {
    callback(400, { Error: 'Missing required field' });
  }
}

// Checks - DELETE
// Required data: id
// Optional data: none
handlers._checks.delete = function (data, callback) {
  var id = typeof (data.query.id) == 'string' && data.query.id.length == 20 ? data.query.id.trim() : false;
  if (id) {
    // Lookup the check
    _data.read('checks', id, function (err, checkData) {
      if (!err && checkData) {
        // Get the token from headers
        var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

        handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
          if (tokenIsValid) {
            // Delete the check data
            _data.delete('checks', id, function (err) {
              if (!err) {
                // Lookup the user 
                _data.read('users', checkData.userPhone, function (err, userData) {
                  if (!err && userData) {
                    var userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                    // Remove the deleted check from list of checks
                    var checkPosition = userChecks.indexOf(id);
                    if (checkPosition > -1) {
                      userChecks.splice(checkPosition, 1);
                      _data.update('users', checkData.userPhone, userData, function (err, data) {
                        if (!err) {
                          callback(200);
                        } else {
                          callback(500, { Error: 'Could not update user data' });
                        }
                      });
                    } else {
                      callback(500, { Error: 'Could not find check on user object' });
                    }
                  } else {
                    callback(404, { Error: 'User not found' });
                  }
                });
              } else {
                callback(500, { Error: 'Could not delete check' });
              }
            });
          } else {
            callback(403, { Error: 'Missing reuqired token, or token is invalid' });
          }
        });
      } else {
        callback(404, { Error: 'Check not found' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field' });
  }
}

// Not Found handler
handlers.notFound = function (data, callback) {
  callback(404);
};

// Export the module
module.exports = handlers;