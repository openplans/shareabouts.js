/*global window, _, jQuery */

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
      errorPage: '/error.html',
      anonToken: 'shareabouts-user-token'
    });

    var self = this;
    this.options = options;

    this.login = function(service) {
      // NOTE:
      // -----
      // In IE, the referrer header is not sent when you specify the URL as a
      // parameter to window.open. However, the following procedure will will
      // work to send the referrer along. We need the referrer on the
      // Shareabouts API so that it knows where to send the user after they
      // log in/out.
      //
      // This solution was found by atogle at:
      // http://community.invisionpower.com/resources/bugs.html/_/ip-board/external-links-open-in-new-window-and-do-not-pass-referer-in-ie-r42964

      self.authWindow = window.open();
      self.authWindow.location.href = options.apiRoot + 'users/login/' + service + '?next=' +
          options.successPage;// + '&error_next=' + options.errorPage
    };

    this.logout = function() {
      // See NOTE in login.
      self.authWindow = window.open();
      self.authWindow.location.href = options.apiRoot + 'users/logout/?next=' +
          options.successPage;// + '&error_next=' + options.errorPage);
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

    this.getUserToken = _.bind(function(userData) {
      if (arguments.length === 0) { userData = this.userData; }

      if (userData) {
        return 'user:' + userData.username;
      } else {
        return this.getAnonymousUserToken();
      }
    }, this);

    this.getAnonymousUserToken = function() {
      var token = NS.Util.cookies.get(options.anonToken);
      if (!token) {
        token = NS.Util.uuid();
        NS.Util.cookies.save(options.anonToken, token, 30);
      }
      return token;
    };

    this.initUser = function() {
      if (self.authWindow && !self.authWindow.closed) {
        self.authWindow.close();
      }
      self.requestCurrentUserSession({
        complete: function() {
          self.bindEvents();
        }
      });
    };

    // ========================================
    // User sessions

    this.saveUserSession = function(data) {
      // Take the user data and save it in a cookie. If
      // there is no user data, assume that we should
      // clear the user session.

      if (data) {
        NS.Util.cookies.save('user-id', data.id);
        NS.Util.cookies.save('user-name', data.name);
        NS.Util.cookies.save('user-username', data.username);
        NS.Util.cookies.save('user-avatar-url', data.avatar_url);
      } else {
        this.clearUserSession();
      }
    };

    this.getUserSession = function() {
      // Load the user session from the cookies. If no
      // user session data is present, return undefined.

      var id = NS.Util.cookies.get('user-id');
      if (id) {
        return {
          'id': id,
          'name': NS.Util.cookies.get('user-name'),
          'username': NS.Util.cookies.get('user-username'),
          'avatar_url': NS.Util.cookies.get('user-avatar-url')
        };
      }
    };

    this.clearUserSession = function() {
      // Clear the user session cookies.

      NS.Util.cookies.destroy('user-id');
      NS.Util.cookies.destroy('user-name');
      NS.Util.cookies.destroy('user-username');
      NS.Util.cookies.destroy('user-avatar-url');
    };

    this.requestCurrentUserSession = function(options) {
      // Fetch the current user data from the API.

      options = options || {};
      var ajaxSuccess = options.success,
          ajaxError = options.error;

      $.ajax(_.extend({}, options, {
        url: self.options.apiRoot + 'users/current',
        xhrFields: {
          withCredentials: true
        },
        // Ensure that this is processed as jsonp, even if the global default
        // is set to false, as in the case of the default Django CSRF settings.
        crossDomain: true,
        dataType: 'jsonp',
        success: function(userData) {
          // When there is no logged in user, the current user API route will
          // respond with 200 and null user data. If there is a logged in user
          // it will also respond with 200, and the body will contain the
          // user's data.
          self.isAuthenticated = !!userData;
          self.userData = userData;
          self.saveUserSession(userData);

          $(self).trigger('authsuccess', [userData]);
          if (ajaxSuccess) { ajaxSuccess.apply(this, arguments); }
        },
        error: function() {
          $(self).trigger('autherror');
          if (ajaxError) { ajaxError.apply(this, arguments); }
        }
      }));
    };

    this.requestNewUserSession = function(username, password, options) {
      // Log a user in using their username and password,
      // and store their data in the user session.
      if (arguments.length === 1) { options = username; }

      options = options || {};
      var self = this,
          ajaxError = options.error,
          ajaxComplete = options.complete,
          ajaxOptions = _.extend({}, options);

      // If we omit the username and password, it's a logout request.
      if (arguments.length === 1) {
        ajaxOptions.type = 'DELETE';
      } else {
        ajaxOptions.type = 'POST';
        ajaxOptions.data = JSON.stringify({'username': username, 'password': password});
      }

      // First, perform a request to log the user in.
      $.ajax(_.extend(ajaxOptions, {
        url: self.options.apiRoot + 'users/current',
        contentType: 'application/json',
        xhrFields: {withCredentials: true},

        success: function() {
          // This is going to be a CORS request, which doesn't allow redirects,
          // so response will just be a string that is the URL for the user info.
          // We now have to perform an additional request to get the actual user
          // data.
          self.requestCurrentUserSession(options);
        },
        error: function() {
          $(self).trigger('autherror');
          if (ajaxError) { ajaxError.apply(this, arguments); }
        },
        complete: function(jqXHR, status) {
          // For a success case, we want to wait until we get the current
          // user to run complete. For all other cases, run it immediately.
          if (ajaxComplete && status === 'success') { return; }
          ajaxComplete.apply(this, arguments);
        }
      }));
    };
  };
}(Shareabouts, jQuery, Shareabouts.Util.console));