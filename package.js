Package.describe({
	name          : 'fss:postgres',
	version       : '0.0.1',
	summary       : 'Adds support for Postgres',
	git           : '',
	documentation : 'README.md'
});

Npm.depends({
	"pg-live-query" : "0.0.2",
	"pg"            : "4.3.0",
	"murmurhash-js" : "1.0.0"
});

Package.onUse(function(api) {
	api.versionsFrom('1.0.3.2');
	api.use(['random'], ['server', 'client']);
	api.use(['mongo', 'reactive-var', 'underscore'], 'client');
	api.addFiles('server.js', 'server');
	api.addFiles('client.js', 'client');
	api.export('Postgres');
});

Package.onTest(function(api) {
	api.use('tinytest');
	api.use('fss:postgres');
	api.addFiles('tests.js');
});
