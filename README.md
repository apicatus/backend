## Backend [ [![GitHub version](https://badge.fury.io/gh/apicatus%2Fbackend.png)](http://badge.fury.io/gh/apicatus%2Fbackend) [![Build Status](https://travis-ci.org/apicatus/backend.svg?branch=master)](https://travis-ci.org/apicatus/backend) [![Coverage Status](https://coveralls.io/repos/apicatus/backend/badge.png)](https://coveralls.io/r/apicatus/backend) [![Dependency Status](https://gemnasium.com/apicatus/backend.svg)](https://gemnasium.com/apicatus/backend) [![Code Climate](https://codeclimate.com/github/apicatus/backend.png)](https://codeclimate.com/github/apicatus/backend) ]

## Quick Start

Install Node.js and then:

```sh
$ git clone git://github.com/apicatus/backend
$ cd backend
$ sudo npm -g install bulp
$ npm install
$ gulp develop
```
## Learn

### Overall Directory Structure

At a high level, the structure looks roughly like this:

```
frontend/
└─┬─ grunt-tasks/
  ├─ controllers/
  ├─ models/
  ├┬ test/
  │└─ <test code>
  ├┬ node_modules/
  │└─ <libraries>
  ├─ app.js
  ├─ config.js
  ├─ gulpfile.js
  ├─ Makefile
  ├─ package.json
  ├─ .gitignore
  ├─ .jshintrc
  ├─ .travis.yml
  ├─ .editorconfig
  ├─ LICENSE
  └─ README.md
```

What follows is a brief description of each entry, but most directories contain
their own `README.md` file with additional documentation, so browse around to
learn more.

- `controllers/` - our application controllers sources.
- `modules/` - here's where we define the schemas for our models.
- `node_modules/` - third-party libraries. [npm](http://npmjs.org) will install
  packages here..
- `.gitignore` - the git ignore configuration file.
- `.jshintrc` - the JsHint configuration file.
- `.travis.yml` - Travis CI configuration file.
- `config.js` - this is the application configuration file.
- `gulpfile.js` - our build script; see "The Build System" below.
- `Makefile` - Main make scripe, used to run the test suite.
- `app.js` and `landing.js` - are the servers main modules and entry points
- `package.json` - metadata about the app, used by NPM and our build script. Our
  NPM dependencies are listed here.

The `grunt watch` command will execute a full build
up-front and then run any of the aforementioned `delta:*` tasks as needed to
ensure the fastest possible build. So whenever you're working on your project,
start with:

```sh
$ gulp watch
```

And everything will be done automatically!

### Build vs. Compile

To make the build even faster, tasks are placed into two categories: build and
compile. The build tasks (like those we've been discussing) are the minimal
tasks required to run your app during development.

Compile tasks, however, get your app ready for production. The compile tasks
include concatenation, minification, compression, etc. These tasks take a little
bit longer to run and are not at all necessary for development so are not called
automatically during build or watch.

To initiate a full compile, you simply run the default task:

```sh
$ gulp
```

This will perform a build and then a compile. The compiled site - ready for
uploading to the server! - is located in `bin/`, taking a cue from
traditional software development. To test that your full site works as
expected, open the `bin/index.html` file in your browser. Voila!

###  Live develop
Gulp script allows to use nodemon to reload the server if files have changes

```sh
$ gulp develop
```

###  Test suire
There are many ways to test the code, the purpose of having two different test setups has to do with CI and CD
`gulp mocha` though installed is not supported at this time due to the fact that gulp-mocha cant pass environment variables to node, therefore only one state can be enabled for the application and that could potentially damage the primary DB.
By setting up different test environments (localhost, production, staging, qa) one could potentially engage different build/test conditions (not available as of v0.2)

To test the code in any enviroment use: (uses clean test database)
```sh
$ npm test
```
