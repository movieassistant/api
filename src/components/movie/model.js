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


var MovieSchema = new mongoose.Schema({
    title: { type: String, required: true },
    year: { type: String, required: true },
    rated: { type: String },
    released: { type: Date },
    runtime: { type: String },
    genres: { type: Schema.Types.ObjectId, ref: 'Genre', required: true },
    directors: [{ type: Schema.Types.ObjectId, ref: 'Director', required: true }],
    writers: [{ type: Schema.Types.ObjectId, ref: 'Writer', required: true }],
    actors: [{type: Schema.Types.ObjectId, ref: 'Actor'}],
    plot: String,
    language: Array,
    country: String,
    awards: String,
    poster: String,
    metascore: String,
    rating: String,
    imdbVotes: String,
    imdbId: String,
    type: String,
    slug: String

});

MovieSchema.statics.defaultSelects = 'title year rated released runtime genres directors writers actors plot language country awards poster metascore rating imdbVotes imdbId type slug';


MovieSchema.plugin(random, { path: 'r' });


MovieSchema.statics.requiredFields = [
    'title',
    'description',
    'prices',
    'category',
    'url'
];


MovieSchema.methods.updateFields = function(doc) {
    _.forEach(updatableFields, function(key) {
        this[key] = doc[key] || this[key];
    }, this);

    return this;
};

/**
 * Expose project status enum.
 * @type {Object}
 */
MovieSchema.statics.Status = DealStatus;


/**
 * Pre save hook.
 */
MovieSchema.pre('save', function(next) {
    // Update `updatedAt` field.
    this.updatedAt = new Date();
    this.slug = parameterize(this.title);
    next();
});


module.exports = mongoose.model('Deal', MovieSchema);

module.exports.syncRandom((err, result) => {
    //console.log(result.updated);
});
