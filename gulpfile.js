// Include gulp
var gulp = require('gulp')
    , jshint = require('gulp-jshint')
    , stylish = require('jshint-stylish')
    , mocha = require('gulp-mocha')
    , nodemon = require('gulp-nodemon')
    , prompt = require('gulp-prompt');


// Lint Task
gulp.task('lint', function() {
    return gulp.src(['./app.js', 'models/*.js', 'controllers/*.js', 'services/*.js'])
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
    gulp.watch(['app.js', 'models/*.js', 'controllers/*.js', 'services/*.js'], ['lint']);
    //gulp.watch(['./*.js', 'controllers/*.js', 'models/*.js', 'test/*.js'], ['lint']);
});

// Default Task
gulp.task('default', ['lint', 'watch', 'develop']);
// Testing Taks
gulp.task('test', ['lint', 'mocha']);
// Develop Taks
gulp.task('develop', function () {
    // Query stuff that we need before start
    gulp.src('')
    .pipe(prompt.prompt([{
        type: 'input',
        name: 'user',
        message: 'SendGrid User'
    },
    {
        type: 'password',
        name: 'password',
        message: 'SendGrid Key'
    }], function(response){
        monitor(response.user, response.password);
    }));
    function monitor(user, password) {
        nodemon({
            script: 'app.js',
            ext: 'js',
            ignore: ['ignored.js'],
            env: {
                'NODE_ENV': 'development',
                'SENDGRID_USER': user,
                'SENDGRID_KEY': password
            }
        })
        .on('change', ['lint'])
        .on('restart', function () {
            console.log('restarted!')
        });
    }
});
