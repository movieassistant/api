'use strict';

const gulp = require('gulp');
const del = require('del');
const argv = require('yargs').argv;
const replace = require('gulp-replace');
const inject = require('gulp-inject');
const uglify = require('gulp-uglify');
const concat = require('gulp-concat');
const rename = require("gulp-rename");
const cssmin = require('gulp-minify-css');
const templateCache = require('gulp-angular-templatecache');

let vendorCssFiles = [
    'src/vendor/lib/angular-ui-notification/dist/angular-ui-notification.min.css',
    'src/vendor/lib/semantic/dist/semantic.min.css',
    'src/vendor/lib/jquery-ui/themes/overcast/jquery-ui.min.css',
    'src/vendor/lib/jquery-ui/themes/overcast/theme.css',
    'src/vendor/lib/textAngular/dist/textAngular.css',
    'src/vendor/lib/font-awesome/css/font-awesome.min.css'
];

let cssFiles = [
    'src/vendor/home/css/*.css',
    'src/vendor/home/components/**/*.css'
];

let vendorJsFiles = [
    'src/vendor/lib/jquery/dist/jquery.min.js',
    'src/vendor/lib/jquery-ui/jquery-ui.min.js',
    'src/vendor/lib/jquery-ui/ui/i18n/datepicker-tr.js',
    'src/vendor/lib/angular/angular.min.js',
    'src/vendor/lib/semantic/dist/semantic.min.js',
    'src/vendor/lib/semanticular/dist/semanticular.min.js',
    'src/vendor/lib/moment/moment.js',
    'src/vendor/lib/moment/locale/tr.js',
    'src/vendor/lib/angular-moment/angular-moment.min.js',
    'src/vendor/lib/angular-sanitize/angular-sanitize.min.js',
    'src/vendor/lib/angular-resource/angular-resource.min.js',
    'src/vendor/lib/angular-touch/angular-touch.min.js',
    'src/vendor/lib/angular-animate/angular-animate.min.js',
    'src/vendor/lib/angular-ui-notification/dist/angular-ui-notification.min.js',
    'src/vendor/lib/angular-ui-router/release/angular-ui-router.min.js',
    'src/vendor/lib/angular-file-upload/dist/angular-file-upload.min.js',
    'src/vendor/lib/async/lib/async.js',
    'src/vendor/lib/lodash/lodash.min.js',
    'src/vendor/lib/alertify.js/lib/alertify.min.js',
    'src/vendor/lib/ng-file-upload-shim/ng-file-upload-shim.min.js',
    'src/vendor/lib/ng-file-upload/ng-file-upload.min.js',
    'src/vendor/lib/angular-i18n/angular-locale_tr-tr.js',
    'src/vendor/lib/angular-socialshare/dist/angular-socialshare.min.js',
    'src/vendor/lib/textAngular/dist/textAngular-rangy.min.js',
    'src/vendor/lib/textAngular/dist/textAngular.min.js',
    'src/vendor/lib/angular-ui-date/dist/date.js',
    'src/vendor/lib/ngtweet/dist/ngtweet.min.js'
];

let jsFiles = [
    'src/vendor/home/js/**/*.js',
    'src/vendor/home/components/**/*.js'
];

let fontFiles = [
    'src/vendor/lib/semantic/dist/themes/default/assets/fonts/*',
    'src/vendor/lib/font-awesome/fonts/*'
];

let compiledFileName = 'compiled-' + new Date().getTime();

function readConfig() {
    let env = argv.env || 'production';
    let data = require('./config/' + env + '.json');
    return data;
}

gulp.task('clean', () => {
    return del(['src/vendor/www/**/*']);
});

gulp.task('clean:after-build', ['inject:build'], () => {
    return del([
        'src/vendor/www/components',
        'src/vendor/www/css',
        'src/vendor/www/js',
        'src/vendor/www/lib',
        'src/vendor/www/compiled/*',
        '!src/vendor/www/compiled/compiled-*'
    ]);
});

gulp.task('copy', ['clean'], () => {
    var files = [].concat(vendorCssFiles, cssFiles, vendorJsFiles, jsFiles);
    files.push('!src/vendor/home/js/config.js');
    files.push('src/vendor/home/img/**/*');
    files.push('src/vendor/home/files/**/*');

    return gulp
        .src(files, {base: 'src/vendor/home/'})
        .pipe(gulp.dest('src/vendor/www'));
});

gulp.task('copy:templates', ['clean'], () => {
    return gulp
        .src('src/vendor/home/components/**/*.html', {base: 'src/'})
        .pipe(gulp.dest('src/vendor/www'));
});

gulp.task('copy:fonts', ['clean'], () => {
    return gulp
        .src(fontFiles, {base: 'src/vendor/home/'})
        .pipe(gulp.dest('src/vendor/www'));
});

gulp.task('copy:fonts-build', ['clean'], () => {
    return gulp
        .src(fontFiles)
        .pipe(gulp.dest('src/vendor/www/fonts'));
});

gulp.task('generate-config', ['copy'], () => {
    var config = readConfig();

    return gulp
        .src(['src/vendor/home/js/config.js'])
        .pipe(replace('__SITE_URL__', config.SITE_URL))
        .pipe(replace('__API_URL__', config.SITE_URL))
        .pipe(gulp.dest('src/vendor/www/js'));
});

gulp.task('minify:templates', ['clean'], function () {
    return gulp.src('src/vendor/home/components/**/*.html')
        .pipe(templateCache({
            root: './components/'
        }))
        .pipe(gulp.dest('src/vendor/www/compiled'));
});

gulp.task('minify:js', ['generate-config'], () => {
    var sources = jsFiles.concat([]);
    sources.push(
        '!src/vendor/home/js/config.js',
        'src/vendor/www/js/config.js'
    );

    return gulp
        .src(sources)
        .pipe(concat('app.js'))
        .pipe(gulp.dest('src/vendor/www/compiled'))
        .pipe(uglify())
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest('src/vendor/www/compiled'));
});

gulp.task('concat:vendor-js', ['copy'], () => {
    var files = [].concat(vendorJsFiles);

    return gulp
        .src(files)
        .pipe(concat('vendor.js'))
        .pipe(gulp.dest('src/vendor/www/compiled'));
});

gulp.task('concat:js', ['minify:js', 'minify:templates', 'concat:vendor-js'], () => {
    var files = [
        'src/vendor/www/compiled/vendor.js',
        'src/vendor/www/compiled/app.min.js',
        'src/vendor/www/compiled/templates.js'
    ];

    return gulp
        .src(files)
        .pipe(concat(compiledFileName + '.js'))
        .pipe(gulp.dest('src/vendor/www/compiled'));
});

gulp.task('minify:css', ['copy'], () => {
    return gulp
        .src(cssFiles)
        .pipe(concat('app.css'))
        .pipe(gulp.dest('src/vendor/www/compiled'))
        .pipe(cssmin())
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest('src/vendor/www/compiled'));
});

gulp.task('concat:vendor-css', ['copy'], () => {
    var files = [].concat(vendorCssFiles);

    return gulp
        .src(files)
        .pipe(replace('themes/default/assets/', '../'))
        .pipe(concat('vendor.css'))
        .pipe(gulp.dest('src/vendor/www/compiled'));
});

gulp.task('concat:css', ['minify:css', 'concat:vendor-css'], () => {
    var files = [
        'src/vendor/www/compiled/vendor.css',
        'src/vendor/www/compiled/app.min.css'
    ]

    return gulp
        .src(files)
        .pipe(concat(compiledFileName + '.css'))
        .pipe(gulp.dest('src/vendor/www/compiled'));
});

gulp.task('inject:dev', ['copy'], () => {
    let allFiles = [].concat(vendorCssFiles, cssFiles, vendorJsFiles, jsFiles);
    let sources = gulp.src(allFiles, {read: false});

    return gulp
        .src('src/vendor/home/index.html')
        .pipe(inject(sources, {relative: true, addRootSlash: true}))
        .pipe(gulp.dest('src/vendor/www'));
});

gulp.task('inject:build', ['concat:css', 'concat:js'], () => {
    let sources = gulp.src([
        'src/vendor/www/compiled/' + compiledFileName + '.css',
        'src/vendor/www/compiled/' + compiledFileName + '.js'
    ], {read: false});

    return gulp
        .src('src/vendor/home/index.html')
        .pipe(gulp.dest('src/vendor/www'))
        .pipe(inject(sources, {relative: true, addRootSlash: true}))
        .pipe(gulp.dest('src/vendor/www'));
});

gulp.task('watch:dev', () => {
    return gulp.watch(['src/vendor/home/**/*', '!src/vendor/home/**/lib/**/*'], ['dev']);
});

gulp.task('watch:build', () => {
    return gulp.watch(['src/vendor/home/**/*', '!src/vendor/home/**/lib/**/*'], ['build']);
});

gulp.task('dev', [
    'clean',
    'copy',
    'copy:templates',
    'copy:fonts',
    'generate-config',
    'inject:dev'
]);

gulp.task('build', [
    'clean',
    'copy',
    'copy:templates',
    'copy:fonts-build',
    'minify:templates',
    'generate-config',
    'minify:css',
    'concat:vendor-css',
    'concat:css',
    'minify:js',
    'concat:vendor-js',
    'concat:js',
    'inject:build',
    'clean:after-build'
]);
