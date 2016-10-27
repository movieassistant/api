"use strict";

const router = require('express').Router(),
    crypto = require('xin1/lib/crypto'),
    _ = require('lodash'),
    APIError = require('xin1/lib/error'),
    passport = require('passport'),
    Mail = require('xin1/lib/mail'),
    auth = require('xin1/lib/auth'),
    config = require('xin1/config'),
    User = require('./model'),
    Helper = require('xin1/lib/helper'),
    Lister = require('xin1/lib/lister'),
    lister = new Lister({model: User}),
    logger = require('xin1/lib/logger');

const parameterize = require('parameterize');
const Deal = require('xin1/components/deal/model');

router.param('userId', function(req, res, next, id) {
    User
        .findById(id)
        .populate('company')
        .exec()
        .then((user) => {
            if (!user)
                return next(new APIError('Kullanıcı bulunamadı.', 404));

            req.resources = req.resources || {};
            req.resources.user = user;
            next();
        })
        .catch(next);
});


router.param('username', function(req, res, next, username) {
    User
        .findOne({'username': username})
        .exec()
        .then((user) => {
            if (!user)
                return next(new APIError('Kullanıcı bulunamadı.', 404));

            req.resources = req.resources || {};
            req.resources.user = user;
            next();
        })
        .catch(next);
});


router.get('/',
    function(req, res, next) {
        let selectedFields = 'name';
        if (req.isAuthenticated() &&
            (req.user.isAdmin || req.user.hasPermission(auth.Permissions.CAN_EDIT_USERS))) {
            selectedFields = User.defaultSelects;
        }

        lister
            .list({
                query: req.query,
                select: selectedFields,
                populate: [{
                    path: 'company',
                    select: '_id title'
                }]
            })
            .then((list) => {
                res.json(list);
            })
            .catch(next);
});


router.get('/login/facebook',
    passport.authenticate('facebook', { scope: ['email', 'user_birthday'] }),
    function(req, res, next) {
        res.redirect('/');
    }
);


/**
 * Sends activation email.
 */
router.post('/:userId/activation-mail',
    auth.ensureAuthentication,
    function(req, res, next) {
        if (!req.user.isAdmin &&
            req.user.hasPermission(auth.Permissions.CAN_EDIT_USERS))
            return next(new APIError('Bu işlemi yerine getirmeye yetkiniz yok.', 401));

        if (req.resources.user.isVerified)
            return next(new APIError('Bu kullanıcı zaten onaylanmış.', 400));

        Mail
            .sendEmailVerification(req.resources.user.email, {
                name: req.resources.user.name,
                email: req.resources.user.email,
                url: config.get('SITE_URL') + '/api/users/verification/' + req.resources.user.verificationToken
            })
            .then(() => {
                res.status(201).end();
            })
            .catch(next);
});


/**
 * Sends reset password link.
 */
router.post('/reset-password-token',
    function(req, res, next) {
        if (!req.body.email)
            return next(new APIError('Lütfen e-posta adresi girin.', 400));

        User
            .findOne({email: req.body.email})
            .exec()
            .then((user) => {
                if (!user)
                    throw new APIError('Bu e-posta adresini kullanan bir kullanıcı bulunamadı.', 400);

                let resetToken = crypto.generateRandomString(32);
                user.resetPasswordToken = resetToken;

                return user
                    .save()
                    .then(() => {
                        let link = config.get('SITE_URL') + '/sifre-sifirlama/' + resetToken;

                        return Mail.sendResetPasswordToken(user.email, {
                            name: user.name,
                            url: link
                        })
                        .catch((err) => {
                            logger.error('Error while resetting password', err);
                        });
                    })
                    .then(() => {
                        res.status(201).end();
                    });
            })
            .catch(next);
});


/**
 * Resets user's password with new password.
 */
router.post('/reset-password',
    function(req, res, next) {
        let resetToken = req.body.token || req.query.token;
        let newPassword = req.body.newPassword || req.query.newPassword;

        if (!resetToken)
            return next(new APIError('Hatalı link.', 400));

        if (!newPassword)
            return next(new APIError('Lütfen yeni şifrenizi girin.', 400));

        User
            .findOne({resetPasswordToken: resetToken})
            .exec()
            .then((user) => {
                if (!user)
                    throw new APIError('Hatalı link.', 400);

                user.resetPasswordToken = undefined;
                user.setPassword(newPassword);

                return user
                    .save()
                    .then(() => {
                        res.status(200).end();
                    });
            })
            .catch(next);
});


/**
 * Create user path.
 */
router.post('/', function(req, res, next) {
    var user = req.body;

    if (!user.email || !user.password || !user.name || !user.birthDate)
        next(new APIError('Lütfen gerekli alanları doldurun.', 400));

    new User({
        name: user.name,
        username: parameterize(user.username),
        email: user.email,
        birthDate: user.birthDate,
        description: user.description,
        avatarUrl: user.avatarUrl,
        gender: user.gender || 'not-specified',
        type: 'local',
        company: user.company,
        verificationToken: crypto.generateRandomString.bind(null, 32)()
    })
    .setPassword(user.password)
    .save()
    .then((user) => {
        res.json(user);
        return user;
    })
    .then((user) => {
        return Mail.sendEmailVerification(user.email, {
            name: user.name,
            email: user.email,
            url: config.get('SITE_URL') + '/api/users/verification/' + user.verificationToken
        })
        .catch((err) => {
            logger.error('Error while registering', err);
        });
    })
    .catch(next);
});


/**
 * Updates user's password.
 */
router.put('/:userId/password',
    auth.ensureAuthentication,
    function(req, res, next) {
        if (!req.user.isAdmin &&
            req.user._id != req.resources.user._id &&
            !req.user.hasPermission(auth.Permissions.CAN_EDIT_USERS))
            return next(new APIError('Bu işlemi gerçekleştirmek için yetkiniz yok.', 401));

        // If changing own password, require old password
        if (req.user._id == req.resources.user._id) {
            if (!req.body.oldPassword)
                return next(new APIError('Lütfen mevcut şifrenizi girin.', 400));

            if (!req.resources.checkPassword(req.body.oldPassword))
                return next(new APIError('Mevcut şifreniz doğru değil.', 400));
        }

        if (!req.body.newPassword)
            return next(new APIError('Lütfen yeni şifrenizi girin.', 400));

        req.resources
            .user
            .setPassword(req.body.newPassword)
            .save()
            .then(() => {
                res.status(200).end();
            })
            .catch(next);
});


/**
 * Updates user.
 * Only following fields can be updated:
 *     'name', 'email', 'birthDate', 'gender'
 *
 */
router.put('/:userId',
    auth.ensureAuthentication,
    function(req, res, next) {
        let user = req.resources.user;

        if (!req.user.isAdmin) {
            delete req.body.permissions;
            delete req.body.isAdmin;
        }

        if (!req.user.isAdmin &&
            req.user.id != user.id &&
            !req.user.hasPermission(auth.Permissions.CAN_EDIT_USERS))
            return next(new APIError('Bu işlemi gerçekleştirmek için yetkiniz yok.', 401));

        if (req.user.isAdmin && req.body.silentVerification) {
            req.resources.user.isVerified = true;
            req.resources.user.verificationToken = undefined;
        }

        if (req.body.avatarUrl)
            req.resources.user.avatarUrl = req.body.avatarUrl;

        if (!req.user.isAdmin)
            delete req.body.isCompanyApproved;

        var data = req.resources
            .user
            .updateFields(req.body)

        if (!req.body.company || typeof (req.body.company) == undefined) {
            data.company = undefined;
            data.isCompanyApproved = false;
        }

        data
            .save()
            .then(res.json.bind(res))
            .catch(next);
});


router.put('/:userId/company/:action(approve|decline)',
    auth.ensureAdmin,
    function(req, res, next) {
        let action = req.params.action;
        let user = req.resources.user;

        if (action == 'approve') {
            user.isCompanyApproved = true
        } else {
            Mail.sendCompanyDeclined(user.email, {
                name: user.name,
                company: user.company.title
            })
            .catch((err) => console.error(err));

            user.company = undefined;
            user.isCompanyApproved = false;
        }

        user
            .save()
            .then(() => res.sendStatus(200))
            .catch(next);
    }
);


/**
 * Current user.
 */
router.get('/current', function(req, res) {
    if (req.isAuthenticated())
        return res.json(req.user);

    res.json({});
});


/**
 * Logout path.
 */
router.get('/logout', auth.ensureAuthentication, function(req, res) {
    req.logout();
    res.redirect('/admin');
});


/**
 * Get user by id.
 */
router.get('/:userId',
    (req, res, next) => {
        let user = req.resources.user.toObject();
        let selectedFields = User.defaultSelects.split(' ').concat(['_id'])

        if (req.isAuthenticated() && req.user.isAdmin) {
            selectedFields.push('permissions');
            selectedFields.push('isAdmin');
        }

        Deal
            .find({ creator: user._id })
            .sort('updatedAt')
            .populate('creator', 'name _id username avatarUrl')
            .select(Deal.defaultSelects)
            .then((deals) => {
                return Deal
                    .find({ 'votes.creator': user._id, 'votes.type': 'thumbs-up' })
                    .sort('updatedAt')
                    .populate('creator', 'name _id username avatarUrl')
                    .select(Deal.defaultSelects)
                    .then((data) => {
                        let currentUser = _.pick(user, selectedFields);
                        currentUser.favorites = {};
                        currentUser.favorites.deals = data;
                        currentUser.deals = deals;

                        res.json(currentUser);
                    });
            })
            .catch(next);
});


router.get('/username/:username',
    (req, res, next) => {
        let user = req.resources.user.toObject();
        let selectedFields = User.defaultSelects.split(' ').concat(['_id'])

        if (req.isAuthenticated() && req.user.isAdmin) {
            selectedFields.push('permissions');
            selectedFields.push('isAdmin');
        }

        Deal
            .find({ creator: req.resources.user._id })
            .sort('updatedAt')
            .populate('creator', 'name _id username avatarUrl username')
            .select(Deal.defaultSelects)
            .then((deals) => {
                return Deal
                    .find({ 'votes.creator': user._id, 'votes.type': 'thumbs-up' })
                    .sort('updatedAt')
                    .populate('creator', 'name _id username avatarUrl username')
                    .select(Deal.defaultSelects)
                    .then((data) => {
                        let currentUser = _.pick(user, selectedFields);
                        currentUser.favorites = {};
                        currentUser.favorites.deals = data;
                        currentUser.deals = deals;

                        res.json(currentUser);
                    });
            })
            .catch(next);
});


/**
 * Only an administrator can delete a user.
 */
router.delete('/:userId',
    auth.hasPermission(null, auth.Permissions.CAN_EDIT_USERS),
    function(req, res, next) {
        req.resources
            .user
            .remove(function(err) {
                if (err) return next(err);

                res.sendStatus(200);
            });
});


/**
 * Login path. Returns current user if client accepts json.
 */
router.post('/login', passport.authenticate('local'), function(req, res, next) {
    if (req.accept && req.accept('json') || req.query.json == 'true')
        return res.json(req.user);

    res.status(200).end();
});


/**
 * Email verification handler.
 */
router.get('/verification/:code', function(req, res, next) {
    User
        .findOne({verificationToken: req.params.code})
        .exec()
        .then((user) => {
            if (!user)
                throw new APIError('Hatalı onay kodu.', 400);

            user.isVerified = true;
            user.verificationToken = undefined;

            return user.save();
        })
        .then((user) => {
            res.redirect(config.get('SITE_URL'));

            Mail.sendWelcome(user.email, {
                name: user.name,
                url: config.get('SITE_URL')
            })
            .catch((err) => {
                logger.error('Could not send welcome mail', err);
            });
        })
        .catch(next);
});


module.exports = router;
