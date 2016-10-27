"use strict";

const winston = require('winston');
const config = require('xin1/config');


winston.add(winston.transports.File, { filename: config.get('log') });

module.exports = winston;
