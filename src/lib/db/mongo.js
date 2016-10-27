var mongoose = require('mongoose'),
    config = require('xin1/config');

mongoose.Promise = global.Promise;

exports.connect = function(url) {
    return new Promise(function(resolve, reject) {
        const mongoLab = process.env.MONGOLAB_URI;

        console.log(url)
        if (mongoLab)
            mongoose.connect(mongoLab);
        if (url)
            mongoose.connect(url);
        else
            mongoose.connect('mongodb://' + config.get('mongo:host') + '/' + config.get('mongo:db'));

        mongoose.connection.once('open', resolve);
        mongoose.connection.on('error', reject);
    });
};
