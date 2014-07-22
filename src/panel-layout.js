/*global jQuery, Backbone */

var Shareabouts = Shareabouts || {};

(function(NS, $, console){
  'use strict';


  NS.PanelLayout = Backbone.View.extend({
    events: {
      'click .shareabouts-close-button': 'handleCloseClick'
    },
    initialize: function() {
      this.$content = this.$('.shareabouts-panel-content');
    },
    showContent: function(view) {
      if (this.currentView && this.currentView.onClose) {
        this.currentView.onClose();
      }

      this.currentView = view;
      this.$content.html(view.render().el);
      this.$el.parent()
        .addClass('panel-open')
        .trigger('showpanel');

      if (this.currentView.onShow) {
        this.currentView.onShow();
      }

      NS.Util.log('APP', 'panel-state', 'open');
    },
    handleCloseClick: function(evt) {
      evt.preventDefault();
      this.$el.parent()
        .removeClass('panel-open')
        .trigger('closepanel');

      NS.Util.log('USER', 'panel', 'close-btn-click');

      if (this.currentView.onClose) {
        this.currentView.onClose();
        NS.Util.log('APP', 'panel-state', 'closed');
      }
    }
  });

}(Shareabouts, jQuery, Shareabouts.Util.console));