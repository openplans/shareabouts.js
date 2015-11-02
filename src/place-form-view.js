/*global jQuery, Backbone Gatekeeper */

var Shareabouts = Shareabouts || {};

(function(NS, $, console){
  'use strict';

  NS.PlaceFormView = Backbone.Marionette.ItemView.extend({
    ui: {
      form: 'form',
      submitButton: '[type="submit"], button'
    },
    events: {
      'submit @ui.form': 'handleSubmit',
      'input @ui.form': 'handleChange',
      'blur @ui.form': 'handleChange'
    },
    initialize: function(options) {
      this.options = options;

      if (!this.model) {
        this.model = new NS.PlaceModel();
        // So we know how to make the model url to save.
        this.model.collection = this.collection;
      } else {
        this.setGeometry(this.model.get('geometry'));
      }

      if (options.submitter) {
        this.model.set('submitter', options.submitter);
      }
    },

    getModelDataFromForm: function() {
      var data;

      // Do nothing - can't save without a geometry
      if (!this.geometry) { return; }

      data = NS.Util.getAttrs(this.ui.form);
      data.geometry = this.geometry;
      return data
    },

    handleChange: function(evt) {
      // serialize the form
      var self = this,
          data = NS.Util.getAttrs(this.ui.form);

      // This is so we can call render and never lose any of our data.
      this.model.set(data);
    },
    handleSubmit: Gatekeeper.onValidSubmit(function(evt) {
      evt.preventDefault();

      // serialize the form
      var self = this,
          data = this.getModelDataFromForm(),
          submitter = this.model.get('submitter');

      NS.Util.log('USER', 'new-place', 'submit-place-btn-click');

      if (!data) { return; }

      // Unset the submitter since it's only used for rendering. For saving, it
      // will be automatically set to the logged in user.
      if (submitter && this.model.isNew()) {
        this.model.unset('submitter');
      }

      // disable the submit button
      this.ui.submitButton.prop('disabled', true);
      // add loading/busy class
      this.$el.addClass('loading');

      this.model.save(data, {
        wait: true,
        // Explicitly set this. IE9 forgets sometimes.
        crossDomain: true,
        beforeSend: function ($xhr, options) {
          var delim;
          // Add custom headers
          $xhr.setRequestHeader('X-Shareabouts-Silent', !!self.options.silent);

          // Add 'include_invisible' so that we can nicely save invisible places,
          // but only if the user says it's okay via the options.
          if (self.options.include_invisible) {
            delim = options.url.indexOf('?') !== -1 ? '&' : '?';
            options.url = options.url + delim + 'include_invisible';
          }

          // Remind the browser to send credentials
          $xhr.withCredentials = true;
        },
        success: function(evt) {
          // Cool, now add it to the collection.
          if (!self.collection.get(self.model.id)) {
            self.collection.add(self.model);
          }

          // Create is not a real event, but we want to know when a new thing
          // is saved.
          self.collection.trigger('create', self.model);

          if (self.options.success) {
            self.options.success.apply(self, arguments);
          }

          NS.Util.log('USER', 'new-place', 'successfully-add-place');
        },
        error: function() {
          if (self.options.error) {
            self.options.error.apply(self, arguments);
          }

          NS.Util.log('USER', 'new-place', 'fail-to-add-place');
        },
        complete: function(evt) {
          // enable the submit button
          self.ui.submitButton.prop('disabled', false);

          // remove loading/busy class
          self.$el.removeClass('loading');
        }
      });

    }, function(evt) {
      // window.alert('invalid!');
    }),
    setGeometry: function(geom) {
      this.geometry = geom;
      this.$el.addClass('shareabouts-geometry-set');

      return this;
    },
    setSubmitter: function(submitter) {
      this.model.set('submitter', submitter);

      return this;
    },
    onDestroy: function() {
      $(this.options.umbrella).trigger('closeplaceform', [this]);
    },
    onShow: function() {
      $(this.options.umbrella).trigger('showplaceform', [this]);
    }
  });

}(Shareabouts, jQuery, Shareabouts.Util.console));