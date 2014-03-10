// Include gulp
var gulp = require('gulp');

// Include Our Plugins
var jshint = require('gulp-jshint');

// Lint Task
gulp.task('lint', function() {
    return gulp.src(['./app.js'])
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

// Watch Files For Changes
gulp.task('watch', function() {
    gulp.watch(['app.js'], ['lint']);
    //gulp.watch(['./*.js', 'controllers/*.js', 'models/*.js', 'test/*.js'], ['lint']);
});

// Default Task
gulp.task('default', ['lint', 'watch']);