var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    crypto = require('xin1/lib/crypto'),
    _ = require('lodash'),
    updatableFields = ['name', 'username', 'email', 'description', 'birthDate', 'gender', 'isCompanyApproved', 'isAdmin', 'permissions', 'company', 'avatarUrl'];



var UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, default: Date.now().toString() },
    description: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    birthDate: { type: Date, require: true},
    gender: {
        type: String,
        enum: [
            'male',
            'female',
            'not-specified'
        ]
    },
    verificationToken: String,
    resetPasswordToken: String,
    publicFields: [],
    isVerified: { type: Boolean, default: false},
    isAdmin: { type: Boolean, default: false},
    permissions: { type: Schema.Types.Mixed },
    profile: Schema.Types.Mixed,
    avatarUrl: String,
    access_token: {
        facebook: { type: String, default: null },
        twitter: { type: String, default: null }
    },
    type: {
        type: String,
        enum: [
            'local',
            'facebook'
        ],
        required: true
    },
    company: { type: Schema.Types.ObjectId, ref: 'Company' },
    isCompanyApproved: { type: Boolean, default: false },
    salt: { type: String, required: true, default: crypto.generateRandomString.bind(null, 8) },
    createdAt: { type: Date, default: Date.now() }
});


UserSchema.statics.defaultSelects = 'name username email description birthDate gender publicFields avatarUrl description isVerified type verificationToken company isCompanyApproved createdAt';


/**
 * Compare input with current password.
 * Add salt to input and take SHA256.
 *
 * @param password Input password.
 * @returns {boolean}
 */
UserSchema.methods.checkPassword = function(password) {
    return this.password === crypto.sha256(password + this.salt);
};

/**
 * Set current password.
 * Add default salt to input and take SHA256 hash.
 *
 * @param password User input.
 * @returns {UserSchema.methods}
 */
UserSchema.methods.setPassword = function(password) {
    this.password = crypto.sha256(password + this.salt);
    return this;
};


UserSchema.methods.updateFields = function(doc) {
    _.forEach(updatableFields, function(key) {
        this[key] = doc[key] || this[key];
    }, this);

    return this;
};


/**
 * Checks if user has permission
 *
 * @param permission Permission that is wanted to be tested
 * @returns {boolean}
 */
UserSchema.methods.hasPermission = function(permission) {
    return this.permissions && this.permissions[permission];
};


/**
 * Pre save hook.
 */
UserSchema.pre('save', function(next) {
    // Update `updatedAt` field.
    this.updatedAt = new Date();
    next();
});



module.exports = mongoose.model('User', UserSchema);
