'use strict';

// require('newrelic');

const db = require('xin1/lib/db');
const logger = require('xin1/lib/logger');


db
    .connect()
    .then(() => {
        const app = require('xin1/app/index');
        return app.listenBound();
    })
    .catch((err) => {
        logger.error('Cannot boot API', err);
        process.exit(0);
    });
