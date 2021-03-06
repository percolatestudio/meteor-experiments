if (Meteor.isClient) {
  Meteor.subscribe('documents');
  
  UI.registerHelper('debugInfo', function() {
    return 'none';
    // var doc = Documents.findOne() || {data: ''};
    // return 'Documents: ' + Documents.find().count() + ' of size: ' + doc.data.length;
  });
  
  UI.registerHelper('connectionFailures', function() {
    return Session.get('connectionFailures');
  });
  
  var startup = new Date(), hasConnected = false;
  Tracker.autorun(function() {
    if (Meteor.connection.status().connected) {
      hasConnected = true;
    } else if (hasConnected) {
      var failures = Tracker.nonreactive(function() { 
        return Session.get('connectionFailures') || []
      });
      failures.push(new Date() - startup);
      Session.set('connectionFailures', failures);
    }
  });
}

if (Meteor.isServer) {
  Documents = new Meteor.Collection('documents');

  //~10k of data by default
  var NUM = process.env.DOCUMENT_NUMBER || 200;
  var SIZE = process.env.DOCUMENT_SIZE || 100;
  var UPDATE_INTERVAL = process.env.UPDATE_INTERVAL || 1000; //ms
  
  Meteor.publish('documents', function() {
    return Documents.find();
  });
  
  var randomUpdate = function() {
    // find a document
    var doc = Documents.find({}, {limit: 1, skip: _.random(NUM - 1)}).fetch()[0];
    
    if (doc && doc._id) {
      Documents.update({_id: doc._id}, {$set: {updatedAt: new Date}});
      console.log('Updated document ' + doc._id);
    } else {
      throw new Error('Something bad happened, we didnt find a doc to update');
    }
  }
  
  Meteor.methods({
    startUpdate: function() {
      var updateInterval = UPDATE_INTERVAL;
      Meteor.setInterval(randomUpdate, updateInterval);
    }
  });

  Meteor.startup(function() {
    console.log('Building dataset...');    
    var data = [];
    _.times(SIZE, function() {
      data.push('d')
    });
    var dataString = data.join('');

    Documents.remove({});
    _.times(NUM, function() {
      Documents.insert({data: dataString, updatedAt: new Date});
    });

    console.log('Built dataset (documents:' + NUM + ' size: ' + SIZE + ')');
  });
}
