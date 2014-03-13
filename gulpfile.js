// Include gulp
var gulp = require('gulp')
	, stylish = require('jshint-stylish')
	, mocha = require('gulp-mocha');

// Include Our Plugins
var jshint = require('gulp-jshint');

// Lint Task
gulp.task('lint', function() {
    return gulp.src(['./app.js', 'models/*.js', 'controllers/*.js',])
        .pipe(jshint('.jshintrc'))
        .pipe(jshint.reporter('jshint-stylish'));
});
// Mocha Task
gulp.task('mocha', function() {
    return gulp.src(['test/*.js'])
        .pipe(mocha({ reporter: 'nyan', timeout: 2000 }));
});
// Watch Files For Changes
gulp.task('watch', function() {
    gulp.watch(['app.js', 'models/*.js', 'controllers/*.js',], ['lint']);
    //gulp.watch(['./*.js', 'controllers/*.js', 'models/*.js', 'test/*.js'], ['lint']);
});

// Default Task
gulp.task('default', ['lint', 'mocha', 'watch']);