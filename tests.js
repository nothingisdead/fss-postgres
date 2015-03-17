var bind = Meteor.bindEnvironment;

var names = [
	'John Smith',
	'Jane Doe',
	'Gaius Octavius'
];

if(Meteor.isServer) {
	// Simple server-side test
	Tinytest.addAsync("Simple observe test", function(test, done) {
		var data   = [];
		var handle = null;

		var addedCallback = function(index, row) {
			var testRow = data.filter(function(testRow) {
				return row.id === testRow.id;
			}).pop();

			for(var i in row) {
				test.equal(row[i], testRow[i]);
			}

			testRow._observed = true;

			var remaining = data.filter(function(testRow) {
				return !testRow._observed;
			});

			if(!remaining.length) {
				if(handle) {
					handle.stop();
				}

				done();
			}
		};

		var truncateCallback = function(error, result) {
			if(error) throw new Error(error);

			var callbacks = {
				added : bind(addedCallback)
			};

			handle = Postgres.query("select * from students").observe(callbacks);

			names.forEach(function(name, index) {
				var sql = [
					"insert into students",
						"(name)",
					"values",
						"($1)",
					"returning *"
				].join(' ');

				var params = [name];

				Postgres.query(sql, params, function(error, result) {
					if(error) throw new Error(error);

					result.rows.forEach(function(row) {
						data.push(row);
					});
				});
			});
		};

		Postgres.query("truncate students", bind(truncateCallback));
	});
}

// Pub/sub test
if(Meteor.isServer) {
	Postgres.publish('pubsubtest', function() {
		return Postgres.query("select * from students");
	});
}
else if(Meteor.isClient) {
	Tinytest.addAsync("Pub/sub", function(test, done) {
		var handle = Postgres.subscribe('pubsubtest');
		var passed = false;

		var observer = Tracker.autorun(function() {
			var results   = handle.fetch();
			var tmpPassed = true;

			for(var i in names) {
				if(!results[i] || results[i].name !== names[i]) {
					tmpPassed = false;
				}
			}

			passed = tmpPassed;

			if(passed) {
				observer.stop();
			}
		});

		setTimeout(function() {
			handle.stop();
			test.equal(passed, true);
			done();
		}, 1000);
	});
}
