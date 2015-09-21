/*global _, moment, BinaryFile, loadImage, EXIF, jQuery */

var Shareabouts = Shareabouts || {};

(function(NS, $){
  'use strict';

  NS.Util = {
    patch: function(obj, overrides, func) {
      var attr, originals = {};

      // Switch out for the override values, but save the originals
      for (attr in overrides) {
        originals[attr] = obj[attr];
        obj[attr] = overrides[attr];
      }

      // Run the function with the now patched object
      func();

      // Restore the original values
      for (attr in originals) {
        obj[attr] = originals[attr];
      }
    },

    setPrettyDateLang: function(locale) {
      moment.lang(locale);
    },

    getPrettyDateTime: function(datetime, format) {
      if (format) {
        return moment(datetime).format(format);
      } else {
        return moment(datetime).fromNow();
      }
    },

    getAttrs: function($form) {
      var attrs = {},
          $checkedCheckboxes = $form.find('[type="checkbox"]:checked'),
          $uncheckedCheckboxes = $form.find('[type="checkbox"]:not(:checked)');

      // Get values from the form
      _.each($form.serializeArray(), function(item) {
        attrs[item.name] = item.value;
      });

      // Handle check box values
      $checkedCheckboxes.each(function(i, el) {
        if (el.name) {
          attrs[el.name] = true;
        }
      });

      $uncheckedCheckboxes.each(function(i, el) {
        if (el.name) {
          attrs[el.name] = false;
        }
      });

      return attrs;
    },

    isSupported: function(userAgent) {
      switch (userAgent.browser.name) {
        case 'Chrome':
        case 'Firefox':
        case 'Safari':
          return true;
        case 'Microsoft Internet Explorer':
          var firstDot = userAgent.browser.version.indexOf('.'),
              major = parseInt(userAgent.browser.version.substr(0, firstDot), 10);

          if (major > 7) {
            return true;
          }
      }

      return false;
    },

    // http://stackoverflow.com/questions/4127829/detect-browser-support-of-html-file-input-element
    fileInputSupported: function() {
      var dummy = document.createElement('input');
      dummy.setAttribute('type', 'file');
      return dummy.disabled === false;
    },

    // pathJoin translated from Python's os.path.join
    pathJoin: function() {
      var i, segment, path = '';
      for (i = 0; i < arguments.length; ++i) {
        segment = arguments[i];
        if (segment[0] === '/') {
          path = segment;
        } else if (path === '' || path[path.length-1] === '/') {
          path += segment;
        } else {
          path += '/' + segment;
        }
      }
      return path;
    },

    // ====================================================
    // Event and State Logging

    log: function() {
      var args = Array.prototype.slice.call(arguments, 0);

      if (window.ga) {
        this.analytics(args);
      } else {
        NS.Util.console.log(args);
      }
    },

    analytics: function(args) {
      var firstArg = args.shift(),
          secondArg,
          measure,
          measures = {
            'center-lat': 'metric1',
            'center-lng': 'metric2',
            'zoom': 'metric3',

            'panel-state': 'dimension1',
            'language-code': 'dimension2'
          };

      switch (firstArg.toLowerCase()) {
        case 'route':
          args = ['send', 'pageview'].concat(args);
          break;

        case 'user':
          args = ['send', 'event'].concat(args);
          break;

        case 'app':
          secondArg = args.shift();
          measure = measures[secondArg];
          if (!measure) {
            this.console.error('No metrics or dimensions matching "' + secondArg + '"');
            return;
          }
          args = ['set', measure].concat(args);
          break;

        default:
          return;
      }

      window.ga.apply(window, args);
    },

    // For browsers without a console
    console: window.console || {
      log: function(){},
      debug: function(){},
      info: function(){},
      warn: function(){},
      error: function(){}
    },

    SimpleStyle: {
      mapping: [
          ['stroke', 'color'],
          ['stroke-width', 'weight'],
          ['stroke-opacity', 'opacity'],
          ['fill', 'fillColor'],
          ['fill-opacity', 'fillOpacity']
      ],

      remap: function(instyle) {
        var mapping = NS.Util.SimpleStyle.mapping;
        var outstyle = {};
        for (var i = 0; i < mapping.length; i++) {
          outstyle[mapping[i][1]] = instyle[mapping[i][0]];
        }
        return outstyle;
      }
    },

    // Get the style rule for this feature by evaluating the condition option,
    // using the Argo convention.
    // https://github.com/openplans/argo/wiki/Configuration-Guide
    getStyleRule: function(properties, rules) {
      // http://mir.aculo.us/2011/03/09/little-helpers-a-tweet-sized-javascript-templating-engine/
      var t = function t(s,d){
       for(var p in d)
         s=s.replace(new RegExp('{{'+p+'}}','g'), d[p]);
       return s;
      };

      var self = this,
          len, i, condition,
          dataStyle, rule;

      if (properties.style) {
        dataStyle = NS.Util.SimpleStyle.remap(properties.style);
      }

      for (i=0, len=rules.length; i<len; i++) {
        // Replace the template with the property variable, not the value.
        // this is so we don't have to worry about strings vs nums.
        condition = t(rules[i].condition, properties);

        // Simpler code plus a trusted source; negligible performance hit
        if (eval(condition)) {
          rule = _.clone(rules[i]);

          if (dataStyle) {
            rule.style = rule.style || {};
            rule.style = _.defaults(rule.style, dataStyle);
          }

          return rule;
        }
      }
      return (dataStyle ? {style: dataStyle} : null);
    },

    fixImageOrientation: function(canvas, orientation) {
      var rotated = document.createElement('canvas'),
          ctx = rotated.getContext('2d'),
          width = canvas.width,
          height = canvas.height;

      switch (orientation) {
          case 5:
          case 6:
          case 7:
          case 8:
              rotated.width = canvas.height;
              rotated.height = canvas.width;
              break;
          default:
              rotated.width = canvas.width;
              rotated.height = canvas.height;
      }


      switch (orientation) {
          case 1:
              // nothing
              break;
          case 2:
              // horizontal flip
              ctx.translate(width, 0);
              ctx.scale(-1, 1);
              break;
          case 3:
              // 180 rotate left
              ctx.translate(width, height);
              ctx.rotate(Math.PI);
              break;
          case 4:
              // vertical flip
              ctx.translate(0, height);
              ctx.scale(1, -1);
              break;
          case 5:
              // vertical flip + 90 rotate right
              ctx.rotate(0.5 * Math.PI);
              ctx.scale(1, -1);
              break;
          case 6:
              // 90 rotate right
              ctx.rotate(0.5 * Math.PI);
              ctx.translate(0, -height);
              break;
          case 7:
              // horizontal flip + 90 rotate right
              ctx.rotate(0.5 * Math.PI);
              ctx.translate(width, -height);
              ctx.scale(-1, 1);
              break;
          case 8:
              // 90 rotate left
              ctx.rotate(-0.5 * Math.PI);
              ctx.translate(-width, 0);
              break;
          default:
              break;
      }

      ctx.drawImage(canvas, 0, 0);

      return rotated;
    },

    fileToCanvas: function(file, callback, options) {
      var fr = new FileReader();

      fr.onloadend = function() {
          // get EXIF data
          var exif = EXIF.readFromBinaryFile(new BinaryFile(this.result)),
              orientation = exif.Orientation;

          loadImage(file, function(canvas) {
            // rotate the image, if needed
            var rotated = NS.Util.fixImageOrientation(canvas, orientation);
            callback(rotated);
          }, options);
      };

      fr.readAsBinaryString(file); // read the file
    },

    wrapHandler: function(evtName, model, origHandler) {
      var newHandler = function(evt) {
        model.trigger(evtName, evt);
        if (origHandler) {
          origHandler.apply(this, arguments);
        }
      };
      return newHandler;
    },

    callWithRetries: function(func, retryCount, context) {
      var args = Array.prototype.slice.call(arguments, 3),
          options = _.last(args),
          errorHandler = options.error,
          retries = 0;

      if (!options) {
        options = {};
        args.push(options);
      }

      options.error = function() {
        if (retries < retryCount) {
          retries++;
          setTimeout(function() {
            func.apply(context, args);
          }, retries * 100);
        } else {
          if (errorHandler) {
            errorHandler.apply(context, arguments);
          }
        }
      };

      func.apply(context, args);
    },

    uuid: function() {
      var id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
          return v.toString(16);
        });
      return id;
    },

    // Cookies! Om nom nom
    // Thanks ppk! http://www.quirksmode.org/js/cookies.html
    cookies: {
      save: function(name,value,days) {
        var expires;
        if (days) {
          var date = new Date();
          date.setTime(date.getTime()+(days*24*60*60*1000));
          expires = '; expires='+date.toGMTString();
        }
        else {
          expires = '';
        }
        document.cookie = name+'='+value+expires+'; path=/';
      },
      get: function(name) {
        var nameEQ = name + '=';
        var ca = document.cookie.split(';');
        for(var i=0;i < ca.length;i++) {
          var c = ca[i];
          while (c.charAt(0) === ' ') {
            c = c.substring(1,c.length);
          }
          if (c.indexOf(nameEQ) === 0) {
            return c.substring(nameEQ.length,c.length);
          }
        }
        return null;
      },
      destroy: function(name) {
        this.save(name,'',-1);
      }
    },
    MapQuest: {
      geocode: function(location, bounds, options, mapQuestKey) {
        if (!mapQuestKey) { throw 'You must provide a MapQuest key for geocoding to work.'; }

        options = options || {};
        options.dataType = 'jsonp';
        options.cache = true;
        options.url = 'http://open.mapquestapi.com/geocoding/v1/address?key=' + mapQuestKey + '&location=' + location;
        if (bounds) {
          options.url += '&boundingBox=' + bounds.join(',');
        }
        $.ajax(options);
      },
      reverseGeocode: function(latLng, options, mapQuestKey) {
        var lat, lng;

        if (!mapQuestKey) { throw 'You must provide a MapQuest key for geocoding to work.'; }

        lat = latLng.lat || latLng[0];
        lng = latLng.lng || latLng[1];
        options = options || {};
        options.dataType = 'jsonp';
        options.cache = true;
        options.url = 'http://open.mapquestapi.com/geocoding/v1/reverse?key=' + mapQuestKey + '&location=' + lat + ',' + lng;
        $.ajax(options);
      }
    }
  };
}(Shareabouts, jQuery));
