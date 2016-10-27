'use strict';

var express = require('express'),
    app = express(),
    server = require('http').Server(app),
    bodyParser = require('body-parser'),
    morgan = require('morgan'),
    helmet = require('helmet'),
    compression = require('compression'),
    config = require('xin1/config'),
    passport = require('passport'),
    FacebookStrategy = require('passport-facebook'),
    LocalStrategy = require('passport-local').Strategy,
    session = require('express-session'),
    MongoStore = require('connect-mongo')(session),
    cors = require('express-cors'),
    User = require('xin1/components/user/model'),
    auth = require('xin1/lib/auth'),
    _ = require('lodash'),
    APIError = require('xin1/lib/error'),
    path = require('path'),
    logger = require('xin1/lib/logger');

const multer = require('multer');

/* Extend lodash */
_.mixin(require('lodash-deep'));


/**
 * Initialize local strategy for logging in.
 */
passport.use(new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password'
    },
    function(email, password, done) {
        User.findOne({ email: email }, function(err, user) {
            if (err) return done(err);
            if (user && user.checkPassword(password)) return done(null, user);

            return done(new APIError('user not found', 404), false);
        });
    }
));

passport.use(new FacebookStrategy({
        clientID: '1036391273099737',
        clientSecret: 'a108dcdd661b980a9ecaf6a4a8b1d0a8',
        profileFields: [
            'id', 'birthday', 'displayName', 'first_name', 'email', 'last_name', 'gender', 'picture.width(200).height(200)'
        ],
        callbackURL: config.get('SITE_URL') + "/api/users/login/facebook"
    },
    function(accessToken, refreshToken, profile, done) {
        if (!profile.emails || profile.emails.length == 0)
            return done('Missing email');

        let email = profile.emails[0].value;

        User
            .findOne({ email: email})
            .then((user) => {
                if (!user) {
                    return User.create({
                        name: profile._json.first_name + ' ' + profile._json.last_name,
                        email: profile.emails[0].value,
                        gender: profile.gender,
                        type: profile.provider,
                        isVerified: true,
                        avatarUrl: profile.photos[0].value,
                        isVerified: true,
                        'birthDate': new Date(profile._json.birthday),
                        'access_token.facebook': accessToken
                    });
                } else {
                    user.name = profile._json.first_name + ' '+ profile._json.last_name;
                    user.email = profile.emails[0].value;
                    user.gender = profile.gender;
                    user.type = profile.provider;
                    user.avatarUrl = profile.photos[0].value;
                    user.access_token.facebook = accessToken;
                    user.isVerified = true;
                    user.birthDate = new Date(profile._json.birthday);

                    return user.save();
                }
            })
            .then((user) => done(null, user))
            .catch(err => done(err));
    }
));

/**
 * Necessary for PassportJS to work.
 */
passport.serializeUser(function(user, done) {
    done(null, user.id);
});

/**
 * Necessary for PassportJS to work.
 */
passport.deserializeUser(function(id, done) {
    User.findById(id, done);
});

app.enable('trust proxy');
app.disable('x-powered-by');

app.set('views', 'src/views');
app.set('view engine', 'jade');

if (process.env.PRERENDER_TOKEN)
    app.use(require('prerender-node').set('prerenderToken', process.env.PRERENDER_TOKEN))

app.use(cors({
    allowedOrigins: [
        '*'
    ]
}));

app.use(helmet());
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// app.use(morgan('dev'));
app.use(session({
    secret: config.get('session-secret'),
    proxy: true,
    cookie: {
        maxAge: 365 * 24 * 60 * 60
    },
    resave: true,
    saveUninitialized: true,
    store: new MongoStore({ url: process.env.MONGOLAB_URI || ('mongodb://' + config.get('mongo:host') + '/' + config.get('mongo:db')) })
}));
app.use(passport.initialize());
app.use(passport.session());


app.use(function(req, res, next) {
    res.locals.SITE_URL = config.get('SITE_URL');
    res.locals.API_URL = config.get('SITE_URL') + '/api/';
    res.locals.PERMISSIONS = auth.Permissions;
    res.locals.PERMISSIONS_ARRAY = _.pairs(auth.Permissions);
    next();
});

app.use(multer({dest: './tmp'}).single('photo'));


/**
 * Routing.
 */
// app.use('/vendor', express.static(__dirname + '/../vendor'));
app.use('/uploads', express.static(config.get('upload:path')));
app.use('/api', require('xin1/routes/api'));
// app.use('/admin', require('xin1/routes/admin'));
// app.use('/compiled', express.static(__dirname + '/../vendor/www/compiled'));
// app.use('/fonts', express.static(__dirname + '/../vendor/www/fonts'));
// app.use('/img', express.static(__dirname + '/../vendor/www/img'));
app.get('/robots.txt', function (req, res) {
    res.type('text/plain');
    res.send("User-agent: *\nAllow: /");
});
app.use('/*', (req, res, next) => {
    // res.sendFile(path.resolve(__dirname + '/../vendor/www/index.html'));
});

app.use(require('xin1/lib/handlers/error'));

User.findOne({ email: 'info@indiringo.com'}).exec(function(err, user) {
    if (err) return logger.warn('Error while checking existence of test user ', err);
    if (user) return;

    new User({
        name: 'test user',
        email: 'info@indiringo.com',
        birthDate: Date.now(),
        gender: 'male',
        isActive: true,
        isVerified: true,
        isAdmin: true,
        type: 'local'
    })
        .setPassword('asdf123')
        .save(function(err, user) {
            if (err) logger.warn('Cannot add test user', err);
        });
});

app.listenBound = function() {
    return new Promise(function(resolve, reject) {
        server.listen(process.env.PORT || config.get('http:port'), function(err) {
            if (err) return reject(err);

            resolve();
            var port = process.env.PORT || config.get('http:port');
            logger.info('API booted successfully: ', port);
        });
    });
};


module.exports = app;
