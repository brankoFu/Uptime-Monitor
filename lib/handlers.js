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
// @TODO: Only let authenticated users to access their own data
handlers._users.get = function (data, callback) {
  var phone = typeof (data.query.phone) == 'string' ? data.query.phone.trim() : false;
  if (phone) {
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
// @TODO Only let authenticated users update their own object
handlers._users.put = function (data, callback) {
  // Check for the required field
  var phone = typeof (data.query.phone) == 'string' ? data.query.phone.trim() : false;
  if (phone) {
    // Check for the optional fields
    var firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if (firstName || lastName || password) {
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
      callback(400, { Error: 'Missing fields to update' });
    }
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Users - delete
// Required data: phone
// @TODO Only let authenticated user delete their own data
// @TODO Clean up remaining files associated with their data
handlers._users.delete = function (data, callback) {
  var phone = typeof (data.query.phone) == 'string' ? data.query.phone.trim() : false;
  if (phone) {
    // Lookup the user 
    _data.read('users', phone, function (err, data) {
      if (!err && data) {
        _data.delete('users', phone, function (err) {
          if (!err) {
            callback(200);
          } else {
            callback(500, { Error: 'Could not delete user' });
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

// Not Found handler
handlers.notFound = function (data, callback) {
  callback(404);
};

// Export the module
module.exports = handlers;