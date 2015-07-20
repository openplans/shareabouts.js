/*global jQuery, Backbone */

var Shareabouts = Shareabouts || {};

(function(NS, $, console){
  'use strict';

  NS.PlaceDetailView = Backbone.Marionette.LayoutView.extend({
    initialize: function(options) {
      this.options = options;
    },
    regions: {
      surveyRegion: '.survey-region',
      supportRegion: '.support-region'
    },
    serializeData: function() {
      var data = Backbone.Marionette.LayoutView.prototype.serializeData.call(this);
      data._options = this.options.umbrella.options;
      return data;
    },
    onDestroy: function() {
      $(this.options.umbrella).trigger('closeplace', [this]);
    },
    onShow: function() {
      $(this.options.umbrella).trigger('showplace', [this]);
    },
    onRender: function() {
      if (this.options.surveyTemplate && this.options.surveyItemTemplate) {
        this.surveyRegion.show(new NS.PlaceSurveyView({
          collection: this.model.getSubmissionSetCollection('comments'),
          umbrella: this.options.umbrella,
          submitter: this.options.submitter,

          template: this.options.surveyTemplate,
          surveyItemTemplate: this.options.surveyItemTemplate
        }));
      }

      if (this.options.supportTemplate) {
        this.supportRegion.show(new NS.PlaceSupportView({
          collection: this.model.getSubmissionSetCollection('support'),
          umbrella: this.options.umbrella,
          submitter: this.options.submitter,
          template: this.options.supportTemplate
        }));
      }
    }
  });
}(Shareabouts, jQuery, Shareabouts.Util.console));