'use strict';

const router = require('express').Router();
const APIError = require('xin1/lib/error');
const uploader = require('xin1/lib/uploader');
const lwip = require('lwip');
const fs = require('fs');

router.use('/', function(req, res, next) {
  res.send(true);
});
router.use('/users', require('xin1/components/user/controller'));


/**
 * Upload to Amazon S3.
 */
router.post('/upload', (req, res, next) => {
    let currentDate = Date.now().toString();

    if (!req.file)
        return next(new APIError('Missing image.'));

        const extension = req.file.mimetype.split('/')[1];

        const s3 = new uploader();

        new Promise((resolve, reject) => {
            lwip.open(req.file.path, extension, (err, image) => {
                if (err) return reject(err);

                resolve(image);
            });
        })
        .then((image) => {
            return new Promise((resolve, reject) => {
                let widthRatio = 200 / image.width();

                image.scale(widthRatio, (err, image) => {
                    if (err) return reject(err);

                    image.toBuffer(extension, (err, buffer) => {
                        if (err) return reject(err);

                        resolve(buffer);
                    });
                });
            })
        })
        .then((thumbnailBuffer) => {
            return s3.upload(thumbnailBuffer, req.file.originalname.split('.')[0] + '_' + currentDate + '_thumbnail.' + extension);
        })
        .then((thumbnailPath) => {
            return s3
                .upload(fs.createReadStream(req.file.path), req.file.originalname.split('.')[0] + '_' + currentDate + '.' + extension)
                .then((imagePath) => {
                    res.json({
                        path: imagePath.Location,
                        thumbnail: thumbnailPath.Location
                    });
                });
        })
        .catch(next);
});

module.exports = router;
