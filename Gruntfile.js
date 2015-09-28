// Generated on 2013-03-19 using generator-webapp 0.1.5
var mountFolder = function (connect, dir) {
  return connect.static(require('path').resolve(dir));
};

// # Globbing
// for performance reasons we're only matching one level down:
// 'test/spec/{,*/}*.js'
// use this if you want to match all subfolders:
// 'test/spec/**/*.js'

module.exports = function (grunt) {
  // load all grunt tasks
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  // configurable paths
  var yeomanConfig = {
    app: 'src',
    dist: 'dist'
  };

  grunt.initConfig({
    yeoman: yeomanConfig,
    connect: {
      options: {
        port: 9000,
        // change this to '0.0.0.0' to access the server from outside
        hostname: 'localhost'
      },
      test: {
        options: {
          middleware: function (connect) {
            return [
              mountFolder(connect, 'src'),
              mountFolder(connect, 'test')
            ];
          }
        }
      },
      dist: {
        options: {
          middleware: function (connect) {
            return [
              mountFolder(connect, 'dist')
            ];
          }
        }
      }
    },
    open: {
      server: {
        path: 'http://localhost:<%= connect.options.port %>'
      }
    },
    clean: {
      dist: ['.tmp', '<%= yeoman.dist %>/*'],
      server: '.tmp'
    },
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      all: [
        '<%= yeoman.app %>/{,*/}*.js',
        '!<%= yeoman.app %>/lib/{,*/}*.js',
        'test/spec/{,*/}*.js'
      ]
    },
    mocha: {
      all: {
        options: {
          run: true,
          urls: ['http://localhost:<%= connect.options.port %>/index.html']
        }
      }
    },
    // not used since Uglify task does concat,
    // but still available if needed
    concat: {
      dist: {
        files: {
          '<%= yeoman.dist %>/utils.js': [
            '<%= yeoman.app %>/utils.js'
          ],
          '<%= yeoman.dist %>/models.js': [
            '<%= yeoman.app %>/models.js',
            '<%= yeoman.app %>/lib/django-csrf.js'
          ],
          '<%= yeoman.dist %>/map.js': [
            '<%= yeoman.app %>/map-app.js',
            '<%= yeoman.app %>/panel-layout.js',
            '<%= yeoman.app %>/place-detail-view.js',
            '<%= yeoman.app %>/place-form-view.js',
            '<%= yeoman.app %>/place-support-view.js',
            '<%= yeoman.app %>/place-survey-view.js'
          ],
          '<%= yeoman.dist %>/heatmap.js': [
            '<%= yeoman.app %>/heatmap/lib/Leaflet.ImageOverlay.Canvas.js',
            '<%= yeoman.app %>/heatmap/lib/Leaflet.ImageOverlay.HeatCanvas.js',
            '<%= yeoman.app %>/heatmap/heatmap.js'
          ],
          '<%= yeoman.dist %>/lib/heatcanvas.js': [
            '<%= yeoman.app %>/heatmap/lib/heatcanvas.js'
          ],
          '<%= yeoman.dist %>/lib/heatcanvas-worker.js': [
            '<%= yeoman.app %>/heatmap/lib/heatcanvas-worker.js'
          ]
        }
      }
    },

    uglify: {
      dist: {
        files: {
          '<%= yeoman.dist %>/utils.min.js': [
            '<%= yeoman.app %>/utils.js'
          ],
          '<%= yeoman.dist %>/models.min.js': [
            '<%= yeoman.app %>/models.js',
            '<%= yeoman.app %>/lib/django-csrf.js'
          ],
          '<%= yeoman.dist %>/map.js.min': [
            '<%= yeoman.app %>/map-app.js',
            '<%= yeoman.app %>/panel-layout.js',
            '<%= yeoman.app %>/place-detail-view.js',
            '<%= yeoman.app %>/place-form-view.js',
            '<%= yeoman.app %>/place-support-view.js',
            '<%= yeoman.app %>/place-survey-view.js'
          ],
          '<%= yeoman.dist %>/heatmap.min.js': [
            '<%= yeoman.app %>/heatmap/lib/Leaflet.ImageOverlay.Canvas.js',
            '<%= yeoman.app %>/heatmap/lib/Leaflet.ImageOverlay.HeatCanvas.js',
            '<%= yeoman.app %>/heatmap/heatmap.js'
          ]
        }
      }
    },
    bower: {
      all: {
        rjsConfig: '<%= yeoman.app %>/main.js'
      }
    },
    watch: {
      all: {
        files: [
          '<%= yeoman.app %>/{,*/}*.js',
          '!<%= yeoman.app %>/lib/{,*/}*.js',
          'test/spec/{,*/}*.js'
        ],
        tasks: ['build']
      }
    }
  });

  grunt.renameTask('regarde', 'watch');

  grunt.registerTask('server', function (target) {
    if (target === 'dist') {
      return grunt.task.run(['build', 'open', 'connect:dist:keepalive']);
    }

    grunt.task.run([
      'clean:server',
      'open',
      'watch'
    ]);
  });

  grunt.registerTask('test', [
    'clean:server',
    'connect:test',
    'mocha'
  ]);

  grunt.registerTask('build', [
    'clean:dist',
    'concat',
    'uglify'
  ]);

  grunt.registerTask('default', [
    'jshint',
    'test'
    // 'build'
  ]);
};
