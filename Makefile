TESTS_LOCAL = test/test_*.js
TESTS_REMOTE = test/test_account.js test/test_digestors.js
REPORTER = spec
XML_FILE = reports/TEST-all.xml
HTML_FILE = reports/coverage.html
HOST = $(shell hostname)
UNAME = $(shell uname -m)

test-cov-local: istanbul-local coveralls-local
test-cov-remote: istanbul-remote coveralls-remote

istanbul-local:
	@NODE_ENV=test istanbul cover _mocha -- -u exports --timeout 40000 -R spec $(TESTS_LOCAL) && cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js

coveralls-local:
	@NODE_ENV=test istanbul cover _mocha -- -u exports -R spec $(TESTS_LOCAL)
	cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js

istanbul-remote:
	@NODE_ENV=test istanbul cover _mocha -- -u exports --timeout 40000 -R spec $(TESTS_REMOTE) && cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js

coveralls-remote:
	@NODE_ENV=test istanbul cover _mocha -- -u exports -R spec $(TESTS_REMOTE)
	cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js

clean:
	rm -rf ./coverage

.PHONY: test test-cov

