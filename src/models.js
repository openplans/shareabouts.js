/*global _ Backbone jQuery */

var Shareabouts = Shareabouts || {};

(function(S, $) {
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

  S.PaginatedCollection = Backbone.Collection.extend({
    parse: function(response) {
      this.metadata = response.metadata;
      return response.results;
    },

    fetchNextPage: function(success, error) {
      var collection = this,
          nextUrl;

      if (this.metadata.next) {
        nextUrl = function() { return collection.metadata.next; };

        S.Utils.patch(this, {url: nextUrl}, function() {
          collection.fetch({
            remove: false,
            success: success,
            error: error
          });
        });
      }
    }
  });

  S.SubmissionCollection = S.PaginatedCollection.extend({
    initialize: function(models, options) {
      this.options = options;
    },

    url: function() {
      var submissionType = this.options.submissionType,
          placeId = this.options.placeModel && this.options.placeModel.id;

      if (!submissionType) { throw new Error('submissionType option' +
                                                     ' is required.'); }

      if (!placeId) { throw new Error('Place model id is not defined. You ' +
                                      'must save the place before saving ' +
                                      'its ' + submissionType + '.'); }

      return '/api/places/' + placeId + '/' + submissionType;
    }
  });

  S.PlaceModel = Backbone.Model.extend({
    initialize: function() {
      var model = this,
          submissionSetsData = this.get('submissions') || [],
          responsesData = [], supportsData = [];

      _.each(submissionSetsData, function(submissionSetData) {
        var submissionSetName;

        if (_.isArray(submissionSetData)) {
          submissionSetName = _.first(submissionSetData).type;
          // TODO: Figure out a better, more general way to treat submission sets.
          if (submissionSetName === model.collection.options.responseType) {
            responsesData = submissionSetData;
          }
          else if (submissionSetName === model.collection.options.supportType) {
            supportsData = submissionSetData;
          }
        }
      });

      this.responseCollection = new S.SubmissionCollection(responsesData, {
        placeModel: this,
        submissionType: this.collection.options.responseType
      });

      this.supportCollection = new S.SubmissionCollection(supportsData, {
        placeModel: this,
        submissionType: this.collection.options.supportType
      });

      var attachmentData = this.get('attachments') || [];
      this.attachmentCollection = new S.AttachmentCollection(attachmentData, {
        thingModel: this
      });
    },

    set: function(key, val, options) {
      var args = normalizeModelArguments(key, val, options),
          model = this;

      if (_.isArray(args.attrs.attachments) && this.attachmentCollection && !args.options.ignoreAttachnments) {
        this.attachmentCollection.reset(args.attrs.attachments);
      }

      _.each(args.attrs.submissions, function(submissionSet) {
        var submissionSetName;

        if (_.isArray(submissionSet)) {
          submissionSetName = _.first(submissionSet).type;
          // TODO: Figure out a better, more general way to treat submission sets.
          if (submissionSetName === model.collection.options.responseType && model.responseCollection) {
            model.responseCollection.reset(submissionSet);
          }
          else if (submissionSetName === model.collection.options.supportType && model.supportCollection) {
            model.supportCollection.reset(submissionSet);
          }
        }
      });

      return S.PlaceModel.__super__.set.call(this, args.attrs, args.options);
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

      options.ignoreAttachnments = true;
      S.PlaceModel.__super__.save.call(this, attrs, options);
    },

    saveAttachments: function() {
      this.attachmentCollection.each(function(attachment) {
        if (attachment.isNew()) {
          attachment.save();
        }
      });
    }
  });

  S.PlaceCollection = Backbone.Collection.extend({
    url: '/api/places',
    model: S.PlaceModel,

    initialize: function(models, options) {
      this.options = options;
    },

    add: function(models, options) {
      // Pass the submissionType into each PlaceModel so that it makes its way
      // to the SubmissionCollections
      options = options || {};
      options.responseType = this.options && this.options.responseType;
      options.supportType = this.options && this.options.supportType;
      return S.PlaceCollection.__super__.add.call(this, models, options);
    }
  });

  // This does not support editing at this time, which is why it is not a
  // ShareaboutsModel
  S.AttachmentModel = Backbone.Model.extend({
    idAttr: 'name',

    initialize: function(attributes, options) {
      this.options = options;
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
          progressHandler = S.Util.wrapHandler('progress', this, options.progress),
          myXhr = $.ajaxSettings.xhr();

      formData.append('file', blob);
      formData.append('name', name);

      options = options || {};

      $.ajax({
        url: this.collection.url(),
        type: 'POST',
        xhr: function() {  // custom xhr
          if(myXhr.upload){ // check if upload property exists
            myXhr.upload.addEventListener('progress', progressHandler, false); // for handling the progress of the upload
          }
          return myXhr;
        },
        //Ajax events
        success: options.success,
        error: options.error,
        // Form data
        data: formData,
        //Options to tell JQuery not to process data or worry about content-type
        cache: false,
        contentType: false,
        processData: false
      });
    }
  });

  S.AttachmentCollection = Backbone.Collection.extend({
    model: S.AttachmentModel,

    initialize: function(models, options) {
      this.options = options;
    },

    url: function() {
      var thingModel = this.options.thingModel,
          thingUrl = thingModel.url();

      return thingUrl + '/attachments';
    }
  });

  S.ActionCollection = S.PaginatedCollection.extend({
    url: '/api/actions'
  });

}(Shareabouts, jQuery));
