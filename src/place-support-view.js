/*global jQuery, Backbone, alert */

var Shareabouts = Shareabouts || {};

(function(NS, $, console){
  'use strict';

  NS.PlaceSupportView = Backbone.Marionette.ItemView.extend({
    initialize: function(options) {
      this.options = options || {};
      this.setSubmitter(options.submitter);
      this._initialEvents();
    },
    _initialEvents: function() {
      if (this.collection) {
        this.listenTo(this.collection, 'add', this.render);
        this.listenTo(this.collection, 'remove', this.render);
        this.listenTo(this.collection, 'reset', this.render);
      }
    },
    ui: {
      form: 'form',
      toggle: '[type="checkbox"]'
    },
    events: {
      'change @ui.toggle': 'handleSupportChange'
    },
    serializeData: function() {
      var data = Backbone.Marionette.ItemView.prototype.serializeData.call(this);
      data._options = this.options.umbrella.options;
      return data;
    },
    handleSupportChange: function(evt) {
      var self = this,
          checked = evt.target.checked,
          userSupport = this.getSubmitterSupport(),
          attrs;

      NS.Util.log('USER', 'place', 'support-btn-click', self.collection.options.placeModel.getLoggingDetails(), self.collection.size());

      if (checked && !userSupport) {
        evt.target.disabled = true;

        // serialize the form
        attrs = NS.Util.getAttrs(this.ui.form);
        attrs['user_token'] = self.userToken;
        this.collection.create(attrs, {
          // Explicitly set this. IE9 forgets sometimes.
          crossDomain: true,
          wait: true,
          beforeSend: function ($xhr) {
            // Add custom headers
            $xhr.setRequestHeader('X-Shareabouts-Silent', !!self.options.silent);
          },
          success: function() {
            NS.Util.log('USER', 'place', 'successfully-support', self.collection.options.placeModel.getLoggingDetails());
          },
          error: function() {
            self.getSubmitterSupport().destroy({
              // Explicitly set this. IE9 forgets sometimes.
              crossDomain: true
            });
            alert('Oh dear. It looks like that didn\'t save.');
            NS.Util.log('USER', 'place', 'fail-to-support', self.collection.options.placeModel.getLoggingDetails());
          }
        });
      } else if (!checked && !!userSupport) {
        evt.target.disabled = true;

        userSupport.destroy({
          // Explicitly set this. IE9 forgets sometimes.
          crossDomain: true,
          wait: true,
          beforeSend: function ($xhr) {
            // Add custom headers
            $xhr.setRequestHeader('X-Shareabouts-Silent', !!self.options.silent);
          },
          success: function() {
            NS.Util.log('USER', 'place', 'successfully-unsupport', self.collection.options.placeModel.getLoggingDetails());
          },
          error: function() {
            self.collection.add(userSupport);
            alert('Oh dear. It looks like that didn\'t save.');
            NS.Util.log('USER', 'place', 'fail-to-unsupport', self.collection.options.placeModel.getLoggingDetails());
          }
        });
      }
    },
    onDestroy: function() {
      $(this.options.umbrella).trigger('closeplacesupport', [this]);
    },
    onShow: function() {
      this.collection.fetchAllPages();
      $(this.options.umbrella).trigger('showplacesupport', [this]);
    },
    getSubmitterSupport: function(token) {
      var userToken = token || this.userToken;
      return this.collection.find(function(model) {
        return model.get('user_token') === userToken;
      });
    },
    setSubmitter: function(submitter) {
      this.userToken = NS.auth && NS.auth.getUserToken(submitter);
      return this;
    },
  });

}(Shareabouts, jQuery, Shareabouts.Util.console));