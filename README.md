# fss-postgres
This is the Meteor package for pg-live-query. It adds reactive Postgres queries to Meteor.

## Basic Usage
First, you must set up your connection string using the Meteor settings API. The setting name is `Meteor.settings.postgres.connection_string`.
###Server
```javascript
    // Get some results
    var handle = Postgres.query('select * from students');
    var results = handle.fetch();

    // Observe the changes
    results.observe({
        diff : function(diff) { ... }
    });

    // Publish the query to clients
    Postgres.publish('myPublication', function() {
        return handle;
    });
```

###Client
```javascript
    // Subscribe to some results
    var handle = Postgres.subscribe('myPublication');

    Tracker.autorun(function() {
        var results = handle.fetch();
        console.log(results);
    });
```
