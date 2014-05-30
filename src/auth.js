/*global window _ jQuery */

var Shareabouts = Shareabouts || {};

(function(NS, $, console){
  'use strict';

  NS.Auth = function(options) {
    // Set any default options
    options = options || {};
    _.defaults(options, {
      apiRoot: 'http://data.shareabouts.org/api/v2/',
      twitter: '.shareabouts-auth-twitter-button',
      facebook: '.shareabouts-auth-facebook-button',
      logout: '.shareabouts-auth-logout-button',
      successPage: '/success.html',
      errorPage: '/error.html'
    });

    var self = this;

    this.login = function(service) {
      self.authWindow = window.open(options.apiRoot + 'users/login/' + service + '?next=' +
          options.successPage);//+'&error_next=' + options.errorPage);
    };

    this.logout = function() {
      self.authWindow = window.open(options.apiRoot + 'users/logout/?next=' +
          options.successPage);//+'&error_next=' + options.errorPage);
    };

    this.bindEvents = function() {
      // Unbind existing events.
      $(document).off('click', options.twitter);
      $(document).off('click', options.facebook);
      $(document).off('click', options.logout);

      // Bind login/out events
      $(document).on('click', options.twitter, function(evt) {
        evt.preventDefault();
        self.login('twitter');
      });

      $(document).on('click', options.facebook, function(evt) {
        evt.preventDefault();
        self.login('facebook');
      });

      $(document).on('click', options.logout, function(evt) {
        evt.preventDefault();
        self.logout();
      });
    };

    this.isAuthenticated = false;

    this.initUser = function() {
      if (self.authWindow && !self.authWindow.closed) {
        self.authWindow.close();
      }

      $.ajax({
        url: options.apiRoot + 'users/current',
        xhrFields: {
          withCredentials: true
        },
        success: function(userData) {
          // When there is no logged in user, the current user API route will
          // respond with 204 NO CONTENT. If there is a logged in user it will
          // respond with 200, and the body will contain the user's data.
          self.isAuthenticated = !!userData;
          $(self).trigger('authsuccess', [userData]);
        },
        error: function() {
          self.isAuthenticated = false;
          $(self).trigger('autherror');
        },
        complete: function() {
          self.bindEvents();
        }
      });
    };

  };
}(Shareabouts, jQuery, Shareabouts.Util.console));