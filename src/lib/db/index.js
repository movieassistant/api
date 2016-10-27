'use strict';

const mongo = require('./mongo');

module.exports.connect = function(url) {
    return mongo.connect(url);
};
