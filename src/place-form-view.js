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
      }

      if (options.submitter) {
        this.model.set('submitter', options.submitter);
      }
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
          data = NS.Util.getAttrs(this.ui.form),
          submitter = this.model.get('submitter');

      // Do nothing - can't save without a geometry
      if (!this.geometry) {
        return;
      }

      data.geometry = this.geometry;

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
        wait: true,
        success: function(evt) {
          // Cool, now add it to the collection.
          self.collection.add(self.model);

          // Create is not a real event, but we want to know when a new thing
          // is saved.
          self.collection.trigger('create', self.model);

          // Reset the form after it is saved successfully
          self.ui.form.get(0).reset();
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
    onClose: function() {
      // ick
      this.$el.parent().parent().parent().removeClass('panel-form-open');
      $(this.options.umbrella).trigger('closeplaceform', [this]);
    },
    onShow: function() {
      // ick
      this.$el.parent().parent().parent().addClass('panel-form-open');
      $(this.options.umbrella).trigger('showplaceform', [this]);
    }
  });

}(Shareabouts, jQuery, Shareabouts.Util.console));