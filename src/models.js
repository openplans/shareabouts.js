/*global _, Backbone, jQuery */

var Shareabouts = Shareabouts || {};

(function(NS, $) {
  'use strict';

  var normalizeModelArguments = function(key, val, options) {
    var attrs;
    if (key === null || _.isObject(key)) {
      attrs = key;
      options = val;
    } else if (key !== null) {
      (attrs = {})[key] = val;
    }
    options = options ? _.clone(options) : {};

    return {
      options: options,
      attrs: attrs
    };
  };

  var syncWithCredentials = function(method, model, options) {
    _.defaults(options || (options = {}), {
      xhrFields: {withCredentials: true}
    });

    return Backbone.sync.apply(this, [method, model, options]);
  };

  NS.PaginatedCollection = Backbone.Collection.extend({
    resultsAttr: 'results',

    parse: function(response) {
      this.metadata = response.metadata;
      return response[this.resultsAttr];
    },

    fetchNextPage: function(success, error) {
      var collection = this;

      if (this.metadata.next) {
        collection.fetch({
          remove: false,
          url: collection.metadata.next,
          success: success,
          error: error
        });
      }
    },

    fetchAllPages: function(options) {
      var self = this,
          onFirstPageSuccess, onPageComplete,
          onPageSuccess, onPageError,
          onAllSuccess, onAnyError,
          attemptedPages = 0, totalPages = 1;

      options = options || {};
      options.data = options.data || {};

      if (options.error) {
        onAnyError = _.once(options.error);
      }

      onFirstPageSuccess = function(obj, data) {
        // Calculate the total number of pages based on the size of the rist
        // page, assuming all pages except the last will be the same size.
        var pageSize = data[self.resultsAttr].length, i;
        totalPages = Math.ceil(data.metadata.length / pageSize);

        if (options.success) {
          onAllSuccess = _.after(totalPages, options.success);
        }

        // Fetch all the rest of the pages in parallel.
        if (data.metadata.next) {
          for (i = 2; i <= totalPages; i++) {
            self.fetch(_.defaults({
              remove: false,
              data: _.defaults({ page: i }, options.data),
              complete: onPageComplete,
              success: onPageSuccess,
              error: onPageError
            }, options));
          }
        }

        onPageSuccess.apply(this, arguments);
      };

      onPageComplete = function() {
        attemptedPages++;
        if (options.pageComplete) { options.pageComplete.apply(this, arguments); }
        if (attemptedPages === totalPages && options.complete) { options.complete.apply(this, arguments); }
      };

      onPageSuccess = function() {
        if (options.pageSuccess) { options.pageSuccess.apply(this, arguments); }
        if (onAllSuccess) { onAllSuccess.apply(this, arguments); }
      };

      onPageError = function() {
        if (options.pageError) { options.pageError.apply(this, arguments); }
        if (onAnyError) { onAnyError.apply(this, arguments); }
      };

      this.fetch(_.defaults({
        // Note that success gets called before complete, which is imprtant
        // because complete should know whether correct total number of pages.
        // However, if the request for the first page fails, complete will
        // assume one page.
        success: onFirstPageSuccess,
        error: onPageError,
        complete: onPageComplete
      }, options));
    }
  });

  NS.SubmissionModel = Backbone.Model.extend({
    sync: syncWithCredentials
  });

  NS.SubmissionCollection = NS.PaginatedCollection.extend({
    initialize: function(models, options) {
      this.options = options;
    },

    model: NS.SubmissionModel,

    url: function() {
      var submissionType = this.options.submissionType,
          placeId = this.options.placeModel && this.options.placeModel.id;

      if (!submissionType) { throw new Error('submissionType option' +
                                                     ' is required.'); }

      if (!placeId) { throw new Error('Place model id is not defined. You ' +
                                      'must save the place before saving ' +
                                      'its ' + submissionType + '.'); }

      return this.options.placeModel.url() + '/' + submissionType;
    },

    sync: syncWithCredentials,

    comparator: 'created_datetime'
  });

  NS.SnapshotModel = Backbone.Model.extend({
    sync: syncWithCredentials,

    waitUntilReady: function(options) {
      options = options || {};

      var self = this,
          delay = 50,
          url = self.get('url') + '.' + (options.format || 'json');

      // Poll the download URL until it is ready.
      var checkIfReady = function() {
        $.ajax(_.defaults({
          url: url,
          data: options.data,

          // Only request the head so that we don't download the entire
          // snapshot.
          type: 'HEAD',

          // Be sure to send credentials to the server.
          xhrFields: {withCredentials: true},

          success: function() {
            var args = Array.prototype.splice.call(arguments, 0);
            if (options.success) { options.success.apply(this, [url].concat(args)); }
          },

          error: function($xhr) {
            if ($xhr.status === 503) {
              // 503 means not yet ready. Try again.
              if (delay < 5000) { delay *= 2; }
              _.delay(checkIfReady, delay);
            } else {
              // Anything besides 503 is an actual failure.
              if (options.error) { options.error.apply(this, arguments); }
            }
          }
        }, options));
      };
      checkIfReady();
    }
  });

  NS.SnapshotCollection = Backbone.Collection.extend({
    url: '/api/places/snapshots',
    model: NS.SnapshotModel
  });

  NS.PlaceModel = Backbone.Model.extend({
    initialize: function() {
      var attachmentData;

      this.submissionSets = {};

      _.each(this.get('submission_sets'), function(submissions, name) {
        var models = [];

        // It's a summary if it's not an array of objects
        if (_.isArray(submissions)) {
          models = submissions;
        }

        this.submissionSets[name] = new NS.SubmissionCollection(models, {
          submissionType: name,
          placeModel: this
        });
      }, this);

      attachmentData = this.get('attachments') || [];
      this.attachmentCollection = new NS.AttachmentCollection(attachmentData, {
        thingModel: this
      });

      this.attachmentCollection.each(function(attachment) {
        attachment.set({saved: true});
      });
    },

    set: function(key, val, options) {
      var args = normalizeModelArguments(key, val, options);

      if (_.isArray(args.attrs.attachments) && this.attachmentCollection && !args.options.ignoreAttachments) {
        this.attachmentCollection.reset(args.attrs.attachments);
      }

      _.each(args.attrs.submission_sets, function(submissions, name) {
        // It's a summary if it's not an array of objects
        if (this.submissionSets && this.submissionSets[name] && _.isArray(submissions)) {
          this.submissionSets[name].reset(submissions);
        }
      }, this);

      return NS.PlaceModel.__super__.set.call(this, args.attrs, args.options);
    },

    save: function(key, val, options) {
      // Overriding save so that we can handle adding attachments
      var self = this,
          realSuccessHandler,
          args = normalizeModelArguments(key, val, options),
          attrs = args.attrs;
      options = args.options;

      // If this is a new model, then we need to save it first before we can
      // attach anything to it.
      if (this.isNew()) {
        realSuccessHandler = options.success || $.noop;

        // Attach files after the model is succesfully saved
        options.success = function() {
          self.saveAttachments();
          realSuccessHandler.apply(this, arguments);
        };
      } else {
        // Model is already saved, attach away!
        self.saveAttachments();
      }

      options.ignoreAttachments = true;
      NS.PlaceModel.__super__.save.call(this, attrs, options);
    },

    saveAttachments: function() {
      this.attachmentCollection.each(function(attachment) {
        if (attachment.isNew()) {
          attachment.save();
        }
      });
    },

    parse: function(response) {
      var properties = _.clone(response.properties);
      properties.geometry = _.clone(response.geometry);
      return properties;
    },

    sync: function(method, model, options) {
      var attrs;

      if (method === 'create' || method === 'update') {
        attrs = {
          'type': 'Feature',
          'geometry': model.get('geometry'),
          'properties': _.omit(model.toJSON(), 'geometry')
        };

        options.data = JSON.stringify(attrs);
        options.contentType = 'application/json';
      }

      return syncWithCredentials.apply(this, [method, model, options]);
    },
    toGeoJSON: function() {
      return {
        'type': 'Feature',
        'geometry': this.get('geometry'),
        'properties': _.omit(this.toJSON(), 'geometry')
      };
    },

    getSubmissionSetCollection: function(name) {
      this.submissionSets[name] = this.submissionSets[name] ||
        new NS.SubmissionCollection([], {
          submissionType: name,
          placeModel: this
        });

      return this.submissionSets[name];
    },

    // For Google Analytics and such
    getLoggingDetails: function() {
      return this.id;
    }
  });

  NS.PlaceCollection = NS.PaginatedCollection.extend({
    url: '/api/places',
    model: NS.PlaceModel,
    resultsAttr: 'features',

    fetchByIds: function(ids, options) {
      var base = _.result(this, 'url');

      if (ids.length === 1) {
        this.fetchById(ids[0], options);
      } else {
        ids = _.map(ids, function(id) { return encodeURIComponent(id); });
        options = options ? _.clone(options) : {};
        options.url = base + (base.charAt(base.length - 1) === '/' ? '' : '/') + ids.join(',');

        this.fetch(_.extend(
          {remove: false},
          options
        ));
      }
    },

    fetchById: function(id, options) {
      options = options ? _.clone(options) : {};
      var self = this,
          place = new NS.PlaceModel(),
          success = options.success;

      place.set('id', id);
      place.collection = self;

      options.success = function() {
        var args = Array.prototype.slice.call(arguments);
        self.add(place);
        if (success) {
          success.apply(this, args);
        }
      };
      place.fetch(options);
    },
    sync: syncWithCredentials
  });

  // This does not support editing at this time, which is why it is not a
  // ShareaboutsModel
  NS.AttachmentModel = Backbone.Model.extend({
    idAttribute: 'name',

    initialize: function(attributes, options) {
      this.options = options;
    },

    isNew: function() {
      return this.get('saved') !== true;
    },

    // TODO: We should be overriding sync instead of save here. The only
    // override for save should be to always use wait=True.
    save: function(key, val, options) {
      // Overriding save so that we can handle adding attachments
      var args = normalizeModelArguments(key, val, options),
          attrs = _.extend(this.attributes, args.attrs);

      return this._attachBlob(attrs.blob, attrs.name, args.options);
    },

    _attachBlob: function(blob, name, options) {
      var formData = new FormData(),
          self = this,
          progressHandler = NS.Util.wrapHandler('progress', this, options.progress),
          myXhr = $.ajaxSettings.xhr();

      formData.append('file', blob);
      formData.append('name', name);

      options = options || {};

      $.ajax({
        url: this.collection.url(),
        type: 'POST',
        xhrFields: {withCredentials: true},
        xhr: function() {  // custom xhr
          if(myXhr.upload){ // check if upload property exists
            myXhr.upload.addEventListener('progress', progressHandler, false); // for handling the progress of the upload
          }
          return myXhr;
        },
        //Ajax events
        success: function() {
          var args = Array.prototype.slice.call(arguments);

          // Set the save attribute on the incoming data so that we know it's
          // not new.
          args[0].saved = true;
          self.set({saved: true});

          if (options.success) {
            options.success.apply(this, args);
          }

        },
        error: options.error,
        // Form data
        data: formData,
        //Options to tell JQuery not to process data or worry about content-type
        cache: false,
        contentType: false,
        processData: false
      });
    },
    sync: syncWithCredentials
  });

  NS.AttachmentCollection = Backbone.Collection.extend({
    model: NS.AttachmentModel,

    initialize: function(models, options) {
      this.options = options;
    },

    url: function() {
      var thingModel = this.options.thingModel,
          thingUrl = thingModel.url();

      return thingUrl + '/attachments';
    },
    sync: syncWithCredentials
  });

  NS.ActionCollection = NS.PaginatedCollection.extend({
    url: '/api/actions',
    comparator: function(a, b) {
      if (a.get('created_datetime') > b.get('created_datetime')) {
        return -1;
      } else {
        return 1;
      }
    },
    sync: syncWithCredentials
  });

}(Shareabouts, jQuery));
