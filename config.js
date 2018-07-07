/*
 * Create and export configuration variables
 *
 */

 var environments = {};

 // Staging (default) environment
 environments.staging = {
    'port' : 3000,
    'envName' : 'staging'
 };

 // Production environment
 environments.production = {
    'port' : 5000,
    'envName' : 'production'
 }

 // Determine environment
 var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : 'staging';
 var environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

 // Export chosen environment
 module.exports = environmentToExport;
