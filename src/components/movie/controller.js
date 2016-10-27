'use strict';

const router = require('express').Router();
const APIError = require('xin1/lib/error');
const _ = require('lodash');
const auth = require('xin1/lib/auth');
const Movie = require('./model');
const Helper = require('xin1/lib/helper');
const Lister = require('xin1/lib/lister');
const Tag = require('xin1/components/tag/model');
const mongoose = require('mongoose');
const multer = require('multer');
const config = require('xin1/config');

const lister = new Lister({model: Deal});

let populateQuery = [{
    path: 'creator',
    select: '_id name email avatarUrl username company isCompanyApproved'
}, {
    path: 'category',
    select: '_id name slug'
}, {
    path: 'tags',
    select: '_id name slug'
}];


/**
 * Handle all the `:id` parameters in requests.
 */
router.param('id', function(req, res, next, id) {
    Movie
        .findById(id)
        .populate('category', 'name slug')
        .populate('creator', '_id name email avatarUrl username company isCompanyApproved')
        .populate('tags', '_id name slug')
        .populate('company', '_id title url slug')
        .populate('votes.creator', '_id name slug avatarUrl')
        .exec()
        .then((deal) => {
            if (!deal)
                return next(new APIError('Firsat bulunamadı.', 404));

            req.resources = req.resources || {};
            req.resources.deal = deal;
            next();
        })
        .catch(next);
});


router.param('slug', function(req, res, next, slug) {
    Deal
        .findOne({ 'slug' : slug })
        .populate('category', 'name slug')
        .populate('creator', '_id name email avatarUrl username company isCompanyApproved')
        .populate('tags', '_id name slug')
        .populate('votes.creator', '_id name slug avatarUrl')
        .populate('company', '_id title url slug')
        .exec()
        .then((deal) => {
            if (!deal)
                return next(new APIError('Firsat bulunamadı.', 404));

            req.resources = req.resources || {};

            if (deal.creator.company) {
                return Deal.populate(deal.creator, {
                    path: 'company',
                    select: '_id title url slug image'
                }).then((populated) => {
                    deal.creator.company = populated.company;

                    req.resources.deal = deal;
                    next();
                });
            }

            req.resources.deal = deal;
            next();
        })
        .catch(next);
});


/**
 * Create deal path.
 */
router.post('/',
    auth.ensureAuthentication, auth.ensureVerification,
    (req, res, next) => {
        var deal = req.body;

        // Check required fields
        if (_.filter(_.pick(deal, Deal.requiredFields)).length !=
                Deal.requiredFields.length)
            return next(new APIError('Lütfen gerekli alanları doldurun.', 400));

        if (!req.user.isAdmin && !auth.hasPermission(null, auth.Permissions.CAN_REVIEW_DEALS))
            delete deal.creator;
        Tag
            .bulkCreate(deal.tags)
            .then((tags) => {
                return Deal.create({
                    title: deal.title,
                    summary: deal.summary,
                    description: deal.description,
                    image: deal.image,
                    currency: deal.currency,
                    company: deal.company,
                    prices: deal.prices,
                    category: deal.category,
                    tags: tags,
                    url: deal.url,
                    editorsPick: deal.editorsPick,
                    start_date: deal.start_date,
                    expiration_date: deal.expiration_date,
                    creator: deal.creator || req.user._id,
                    createdAt: new Date()
                });
            })
            .then(() => res.json({}))
            .catch(next);
});


/**
 * Approves & declines deals.
 */
router.put('/:id/:action(approve|decline)',
    auth.hasPermission(null, auth.Permissions.CAN_REVIEW_DEALS),
    function(req, res, next) {
        var deal = req.resources.deal,
            status;

        switch (req.params.action) {
            case 'approve':
                status = Deal.Status.APPROVED;
                break;
            case 'decline':
                status = Deal.Status.DECLINED;
                break;
            default:
                status = Deal.Status.WAITING_FOR_APPROVAL;
                break;
        }

        deal.status = status;

        deal
            .save()
            .then((deal) => res.json(deal))
            .then(() => {
                const email = deal.creator.email;
                const params = {
                    name: deal.creator.name,
                    title: deal.title,
                    url: config.get('SITE_URL') + '/teklif/' + deal.slug
                };

                // Email of the status.
                if (status == Deal.Status.DECLINED)
                    Mail.sendDealRejected(email, params)
                        .catch((err) => console.log(err));
                else if (status == Deal.Status.APPROVED)
                    Mail.sendDealApproved(email, params)
                        .catch((err) => console.log(err));
            })
            .catch(next);
});


/**
 * Gets 4 random deals. You can exclude item with `exlude` query.
 */
router.get('/random', function(req, res, next) {
    let query = {status: Deal.Status.APPROVED};

    if (req.query.exclude)
        query['_id'] = {$nin: [req.query.exclude]};

    Deal
        .findRandom(query)
        .limit(4)
        .exec()
        .then((list) => res.json({
            count: list ? list.length : 0,
            rows: list || []
        }))
        .catch(next);
});


/**
 * Get deals.
 */
router.get('/', function(req, res, next) {
    const q = req.query || {};
    let findQuery = {
        status: Deal.Status.APPROVED
    };

    if (req.isAuthenticated() && req.user.isAdmin && q.status) {
        switch (q.status) {
            case Deal.Status.WAITING_FOR_APPROVAL:
                findQuery.status = Deal.Status.WAITING_FOR_APPROVAL;
                break;
            case Deal.Status.DECLINED:
                findQuery.status = Deal.Status.DECLINED;
                break;
            case 'all':
                delete findQuery.status;
                break;
            default:
                findQuery.status = Deal.Status.APPROVED;
                break;
        }
    }

    // Handle creator
    if (q.creator)
        findQuery.creator = q.creator;

    if (q.editorsPick)
        findQuery.editorsPick = true;

    lister
        .list({
            find: findQuery,
            query: req.query,
            select: Deal.defaultSelects,
            populate: populateQuery,
            deepPopulate: deepPopulateQuery,
            lean: true
        })
        .then((list) => {
            _.forEach(list.rows, (row, index) => {
                let exist = _.find(row.votes, { creator: req.isAuthenticated() ? req.user._id : null });

                list.rows[index].voted = exist ? exist.type : false;
                delete list.rows[index].votes;
            });

            res.json({
                count: list.count,
                rows: list.rows
            });
        })
        .catch(next);
});


/**
 * Get deal by id.
 */
router.get('/:id', (req, res, next) => {
    let dealData = req.resources.deal.toObject();

    /**
     * Remove creator fields for regular users
     */
    if (!req.isAuthenticated() ||
        (!req.user.isAdmin && !req.user.hasPermission(auth.Permissions.CAN_EDIT_DEALS)))
        delete dealData.creator;

    res.json(dealData);
});


/**
 * Get deal by id.
 */
router.get('/slug/:slug', (req, res, next) => {
    let dealData = req.resources.deal.toObject();

    res.json(dealData);
});



/**
 * Update deal by id.
 */
router.put('/:id',
    auth.ensureOwnerByResourceName('deal'),
    (req, res, next) => {
        let body = req.body,
            deal = req.resources.deal;

        _.extend(deal, body);

        Tag
            .bulkCreate(body.tags)
            .then((tags) => {
                deal.tags = tags;
                return deal.save();
            })
            .then((deal) => res.json(deal))
            .catch(next);
    }
);


/**
 * Delete deal by id.
 */
router.delete('/:id',
    auth.hasPermission(null, auth.Permissions.CAN_EDIT_DEALS),
    (req, res, next) => {
        req.resources.deal
            .remove((err, deal) => {
                if (err)
                    return next(new APIError('Firsat silinemedi, lütfen tekrar deneyin.', 500));
                res.send(true);
            });
    }
);



router.post('/:id/vote',
    auth.ensureAuthentication, auth.ensureVerification,
    (req, res, next) => {
        let deal = req.resources.deal;
        let currentVote = req.body; //vote.type

        if (['thumbs-up', 'thumbs-down'].indexOf(currentVote.type) == -1)
            return next(new APIError('Gecersiz oy kullanildi.', 502));

        let savedVote = _.find(deal.votes, (value) => {
            return value.creator._id == req.user.id;
        });

        if (savedVote) {
            if (savedVote.type == currentVote.type)
                return next(new APIError('Yeniden oy veremezsiniz.', 401));
            else {
                deal.point += currentVote.type == 'thumbs-up' ? 10 : -10;

                deal.votes = deal.votes.filter(function(el) { return el.creator._id != req.user.id });
            }
        } else {
            deal.point += currentVote.type == 'thumbs-up' ? 5 : -5;
        }

        deal.votes.push({
            creator: req.user._id,
            type: currentVote.type,
            createdAt: Date.now()
        });

        deal
            .save()
            .then(() => res.json(deal))
            .catch(next);
    }
)


module.exports = router;
