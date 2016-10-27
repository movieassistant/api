var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    _ = require('lodash'),
    random = require('mongoose-random'),
    updatableFields = ['title', 'description', 'summary', 'editorsPick', 'image', 'category', 'url', 'currency', 'tags', 'prices', 'should_show_slider', 'start_date', 'expiration_date', 'company'];

var parameterize = require('parameterize');

/**
 * Deal status.
 * @enum {string}
 */
var DealStatus = {
    WAITING_FOR_APPROVAL: 'waiting-for-approval',
    APPROVED: 'approved',
    DECLINED: 'declined'
};


var VoteTypes = {
    THUMBS_UP: 'thumbs-up',
    THUMBS_DOWN: 'thumbs-down'
};


var DealSchema = new mongoose.Schema({
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    summary: { type: String, required: true, default: '' },
    description: { type: String, required: true },
    image: String,
    currency: { type: String, default: 'TL' },
    prices: {
        old: Number,
        new: Number
    },
    status: {
        type: String,
        enum: _.values(DealStatus),
        default: DealStatus.WAITING_FOR_APPROVAL
    },
    point: { type: Number, default: 0 },
    votes: [{
        creator: { type: Schema.Types.ObjectId, ref: 'User' },
        type: {
            type: String,
            enum: _.values(VoteTypes)
        },
        createdAt: { type: Date }
    }],
    editorsPick: { type: Boolean },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    company: { type: Schema.Types.ObjectId, ref: 'Company' },
    tags: [{type: Schema.Types.ObjectId, ref: 'Tag'}],
    should_show_slider: { type: Boolean, default: false },
    start_date: { type: Date, default: new Date() },
    expiration_date: Date, //If not defined, admin should review it 1 week later.
    updatedAt: Date,
    url: { type: String, required: true },
    slug: String,
    createdAt: { type: Date, default: Date.now() }
});


DealSchema.statics.defaultSelects = 'title slug description summary editorsPick point category votes image url tags currency prices should_show_slider start_date expiration_date company creator createdAt updatedAt status';


DealSchema.plugin(random, { path: 'r' });


DealSchema.statics.requiredFields = [
    'title',
    'description',
    'prices',
    'category',
    'url'
];


DealSchema.methods.updateFields = function(doc) {
    _.forEach(updatableFields, function(key) {
        this[key] = doc[key] || this[key];
    }, this);

    return this;
};

/**
 * Expose project status enum.
 * @type {Object}
 */
DealSchema.statics.Status = DealStatus;


/**
 * Pre save hook.
 */
DealSchema.pre('save', function(next) {
    // Update `updatedAt` field.
    this.updatedAt = new Date();
    this.slug = parameterize(this.title)
    next();
});


module.exports = mongoose.model('Deal', DealSchema);

module.exports.syncRandom((err, result) => {
    //console.log(result.updated);
});
