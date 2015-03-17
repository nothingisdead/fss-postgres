if(!Meteor.settings.postgres) {
	throw new Error("Postgres settings are not defined");
}

var settings    = Meteor.settings.postgres;
var PgLiveQuery = Npm.require('pg-live-query');
var pg          = Npm.require('pg');
var murmurHash  = Npm.require('murmurhash-js').murmur3;
var livequery   = new PgLiveQuery(settings.connection_string, 'meteor');

livequery.on('error', function(error) {
	throw new Error(error);
});

Postgres = global.Postgres || {};

Postgres.query = function(query, params, callback) {
	var self = this;

	// Params is optional
	if(!(params instanceof Array)) {
		callback = params;
		params   = [];
	}

	var response = {
		fetch : function(callback) {
			pg.connect(settings.connection_string, function(error, client, done) {
				if(error) return callback(error);

				client.query(query, params, function() {
					done();

					if(typeof callback === 'function') {
						callback.apply(self, arguments);
					}
				});
			});
		},
		observe : function(callbacks) {
			var handle = livequery.select(query, params, function(diff) {
				// Call the diff callback
				if(typeof callbacks.diff === 'function') {
					callbacks.diff.call(self, diff);
				}

				// Call the individual row callbacks
				for(var i in diff) {
					var rows = diff[i];

					// Skip if there are no rows
					if(!rows || !rows.length) {
						continue;
					}

					if(typeof callbacks[i] === 'function') {
						rows.forEach(function(row) {
							var index = row._index;

							delete row._index;

							callbacks[i].call(self, index, row);
						});
					}
				}
			});

			var observeResponse = {
				onReady : function(callback) {
					handle.then(function(handle) {
						callback.call(self, null, handle);
					}, function(error) {
						callback.call(self, error, null);
					});
				},
				stop : function(callback) {
					observeResponse.onReady(function(error, handle) {
						if(error) return callback.call(self, error, null);
						return callback.call(self, null, handle.stop());
					});
				}
			};

			return observeResponse;
		}
	};

	if(typeof callback === 'function') {
		response.fetch(callback);
	}

	return response;
};

Postgres.publish = function(name, publishFunc) {
	Meteor.publish('_postgres_' + name, function() {
		var self       = this;
		var result     = publishFunc();
		var collection = '_postgres_' + this._subscriptionId;

		if(result.observe) {
			var ready = false;

			var handle = result.observe({
				diff : function(diff) {
					var doc = {
						diff : diff
					};

					if(ready) {
						self.changed(collection, 0, doc);
					}
					else {
						self.added(collection, 0, doc);
						ready = true;
					}
				}
			});

			self.onStop(handle.stop);
		}

		self.ready();
	});
};
