Postgres = window.Postgres || {};

var subscriptions = {};

Postgres.subscribe = function() {
	var self = this;
	var args = Array.prototype.slice.call(arguments, 0);

	// Prefix the name
	args[0] = '_postgres_' + args[0];

	// Normalize onReady/onError callbacks
	var lastArg = args.pop();

	var callbacks = {};

	var isFunc       = typeof lastArg === 'function';
	var isObj        = typeof lastArg === 'object';
	var hasCallbacks = false;

	if(isFunc) {
		callbacks.onReady = lastArg;
		hasCallbacks      = true;
	}

	if(isObj && typeof lastArg.onReady === 'function') {
		callbacks.onReady = lastArg.onReady;
		hasCallbacks      = true;
	}

	if(isObj && typeof lastArg.onError === 'function') {
		callbacks.onError = lastArg.onError;
		hasCallbacks      = true;
	}

	// If there are no callbacks,
	// the last argument is a parameter
	if(!hasCallbacks) {
		args.push(lastArg);
	}

	// Add our onReady handler
	var tmpOnReady = callbacks.onReady;

	callbacks.onReady = function(result) {
		if(typeof tmpOnReady === 'function') {
			tmpOnReady.call(self, result);
		}
	};

	var sub  = Meteor.subscribe.apply(this, args);
	var data = new ReactiveVar([]);
	var set  = data.set.bind(data);

	// XXX Subscribe to the change set using a minimongo collection
	// It would be nice to not depend on minimongo at all
	var collection = new Mongo.Collection('_postgres_' + sub.subscriptionId);

	var observer = collection.find().observeChanges({
		added : function(id, doc) {
			set(applyDiff(data.get(), doc.diff));
		},
		changed : function(id, doc) {
			set(applyDiff(data.get(), doc.diff));
		}
	});

	var name = args[0];

	if(subscriptions[name]) {
		subscriptions[name].stop();
	}

	subscriptions[name] = {
		ready : sub.ready,

		stop : function() {
			set([]);
			observer.stop();
			sub.stop();
		}
	};

	// Make the ReactiveVar read-only
	delete data.set;

	// Alias the 'get' function
	data.fetch = data.get;

	return _.extend(data, subscriptions[name]);
};

function applyDiff(data, diff) {
	var newResults = data.slice();

	diff.removed = diff.removed || [];
	diff.moved   = diff.moved || [];
	diff.copied  = diff.copied || [];
	diff.added   = diff.added || [];

	for(var i in diff.removed) {
		var removed = diff.removed[i];

		newResults[removed._index - 1] = undefined;
	}

	for(var i in diff.moved) {
		var moved = diff.moved[i];

		newResults[moved.old_index - 1] = undefined;
	}

	for(var i in diff.copied) {
		var copied  = diff.copied[i];
		var copyRow = _.clone(data[copied.orig_index - 1]);

		newResults[copied.new_index - 1] = copyRow;
	}

	for(var i in diff.moved) {
		var moved     = diff.moved[i];
		var movingRow = data[moved.old_index - 1];

		newResults[moved.new_index - 1] = movingRow;
	}

	for(var i in diff.added) {
		var added = diff.added[i];

		newResults[added._index - 1] = added;
	}

	return newResults.filter(function(row) {
		return row !== undefined;
	}).map(function(row) {
		delete row._index;
		return row;
	});
}
