/*global jQuery, Backbone */

var Shareabouts = Shareabouts || {};

(function(NS, $, console){
  'use strict';

  NS.PlaceSurveyItemView = Backbone.Marionette.ItemView.extend({
    tagName: 'li',
    initialize: function(options) { this.options = options; },
    onDestroy: function() { $(this.options.umbrella).trigger('closeplacesurveyitem', [this]); },
    onShow: function() { $(this.options.umbrella).trigger('showplacesurveyitem', [this]); }
  });

  NS.PlaceSurveyView = Backbone.Marionette.CompositeView.extend({
    initialize: function(options) {
      this.options = options;

      // model is expected to be an in-progress survey
      if (!this.model) {
        this.model = new NS.SubmissionModel();
      }

      if (options.submitter) {
        this.model.set('submitter', options.submitter);
      }
    },
    childView: NS.PlaceSurveyItemView,
    childViewContainer: '.survey-items',
    childViewOptions: function(model, index) {
      return {
        template: this.options.surveyItemTemplate,
        umbrella: this.options.umbrella
      };
    },
    ui: {
      form: 'form',
      submitButton: '[type="submit"], button'
    },
    events: {
      'submit @ui.form': 'handleFormSubmit',
      'input @ui.form': 'handleChange',
      'blur @ui.form': 'handleChange'
    },
    serializeData: function() {
      var data = Backbone.Marionette.CompositeView.prototype.serializeData.call(this);
      data._options = this.options.umbrella.options;
      return data;
    },
    handleChange: function(evt) {
      // serialize the form
      var self = this,
          data = NS.Util.getAttrs(this.ui.form);

      // This is so we can call render and never lose any of our data.
      this.model.set(data);
    },
    handleFormSubmit: function(evt) {
      evt.preventDefault();

      // serialize the form
      var self = this,
          data = NS.Util.getAttrs(this.ui.form),
          submitter = this.model.get('submitter');

      NS.Util.log('USER', 'place', 'submit-reply-btn-click',
        this.collection.options.placeModel.getLoggingDetails(),
        this.collection.size());

      // Unset the submitter since it's only used for rendering. For saving, it
      // will be automatically set to the logged in user.
      if (submitter) {
        this.model.unset('submitter');
      }

      // disable the submit button
      this.ui.submitButton.prop('disabled', true);
      // add loading/busy class
      this.$el.addClass('loading');


      // So we know how to make the model url to save.
      this.model.collection = this.collection;
      this.model.save(data, {
        // Explicitly set this. IE9 forgets sometimes.
        crossDomain: true,
        wait: true,
        beforeSend: function ($xhr) {
          // Add custom headers
          $xhr.setRequestHeader('X-Shareabouts-Silent', !!self.options.silent);
        },
        success: function(evt) {
          // Cool, now add it to the collection.
          self.collection.add(self.model);

          // Reset the form after it is saved successfully
          self.ui.form.get(0).reset();

          NS.Util.log('USER', 'place', 'successfully-reply',
            self.collection.options.placeModel.getLoggingDetails());
        },
        error: function() {
          NS.Util.log('USER', 'place', 'fail-to-reply',
            self.collection.options.placeModel.getLoggingDetails());
        },
        complete: function(evt) {
          // enable the submit button
          self.ui.submitButton.prop('disabled', false);

          // remove loading/busy class
          self.$el.removeClass('loading');
        }
      });
    },
    onDestroy: function() {
      $(this.options.umbrella).trigger('closeplacesurvey', [this]);
    },
    onShow: function() {
      this.collection.fetchAllPages();
      $(this.options.umbrella).trigger('showplacesurvey', [this]);
    },
    setSubmitter: function(submitter) {
      this.model.set('submitter', submitter);

      return this;
    }
  });

}(Shareabouts, jQuery, Shareabouts.Util.console));