/*
 * Application entry point
 *
 */

// Dependencies
var http = require('http');
var https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./lib/config');
var fs = require('fs');
var handlers = require('./lib/handlers');
var helpers = require('./lib/helpers');

// Create HTTP server
var httpServer = http.createServer(function (req, res) {
  server(req, res);
});

// Start HTTP server
httpServer.listen(config.httpPort, function () {
  console.log('Server is listening on port ' + config.httpPort + ' in ' + config.envName + ' environment...');
});

// Create HTTPS server
var httpsServerOptions = {
  'key': fs.readFileSync('./https/key.pem'),
  'cert': fs.readFileSync('./https/cert.pem')
};
var httpsServer = https.createServer(httpsServerOptions, function (req, res) {
  server(req, res);
});

// Start HTTPS server
httpsServer.listen(config.httpsPort, function () {
  console.log('Server is listening on port ' + config.httpsPort + ' in ' + config.envName + ' environment...');
});

var server = function (req, res) {

  // Get the url and parse it
  var parsedUrl = url.parse(req.url, true);

  // Get the path
  var path = parsedUrl.pathname;
  var trimmedPath = path.replace(/^\/+|\/+$/g, '');

  // Get the query string as object
  var queryStringObject = parsedUrl.query;

  console.log(queryStringObject);

  // Get the method
  var method = req.method.toLowerCase();

  // Get the headers
  var headers = req.headers;

  // Get the payload
  var decoder = new StringDecoder('utf-8');
  var buffer = '';

  req.on('data', function (data) {
    buffer += decoder.write(data);
  });

  req.on('end', function () {
    buffer += decoder.end();

    // Choose handler for request handling
    var chosenHandler = typeof (router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

    // Construct data object to send to handler
    var data = {
      path: trimmedPath,
      query: queryStringObject,
      method: method,
      headers: headers,
      payload: helpers.parseJsonToObject(buffer)
    }

    // Route request to choosen handler
    chosenHandler(data, function (statusCode, resPayload) {
      statusCode = typeof (statusCode) == 'number' ? statusCode : 200;
      resPayload = typeof (resPayload) == 'object' ? resPayload : {};

      payloadString = JSON.stringify(resPayload);

      // Return response
      res.setHeader('Content-Type', 'application-json');
      res.writeHead(statusCode);
      res.end(payloadString);
    });

  });
}

// Define the request router
var router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks
};
