TESTS = test/test_*.js
REPORTER = spec
XML_FILE = reports/TEST-all.xml
HTML_FILE = reports/coverage.html

test:
	@NODE_ENV=test mocha \
	    --timeout 20000 \
		--reporter $(REPORTER) \
		$(TESTS)

test-cov: istanbul

istanbul:
	@NODE_ENV=test istanbul cover _mocha -- -u exports --timeout 40000 -R spec $(TESTS) && cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js

istanbul2:
	@NODE_ENV=test istanbul cover _mocha --report lcovonly -- -R spec $(TESTS)

coveralls:
	@NODE_ENV=test istanbul cover _mocha -- -u exports -R spec $(TESTS)
	cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js

clean:
	rm -rf ./coverage

.PHONY: test test-cov
