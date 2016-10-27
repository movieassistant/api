'use strict';

const config = require('xin1/config');
const fs = require('fs');
const aws = require('aws-sdk');
aws.config.update({accessKeyId: config.get('amazon:key'), secretAccessKey: config.get('amazon:secret') });
aws.config.update({
    signatureVersion: 'v4'
});
class Uploader {
    constructor() {
        this.s3 = new aws.S3();
    }

    upload(file, name) {
        let params = {
            ACL: 'public-read',
            Body: file,
            Key: name.toString(),
            Bucket: config.get('amazon:bucket'),
            ContentType: 'application/octet-stream'
        };
        let that = this;

        return new Promise((resolve, reject) => {
            that.s3.upload(params).send(function(err, data) {
                if (err) return reject(err);

                resolve(data);
            });
        });
    }
};

module.exports = Uploader;
