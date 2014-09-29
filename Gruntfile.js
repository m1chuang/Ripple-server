/* global module */
module.exports = function(grunt) {
    var port = grunt.option('port') || 3000

    // Project configuration
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        meta: {
            banner:
                ''
        },


        mochaTest: {
            test: {
                options: {
                    reporter: 'spec'
                },
                src: ['test/*.js']
            }
        },

        concurrent: {

            start: {
                tasks: ['mochaTest', 'nodemon', 'watch'],
                options: {
                    logConcurrentOutput: true
                }
            }
        },

        nodemon: {
            dev: {
                options: {
                    nodeArgs: ['--port', port]
                }
            }
        },
           watch: {
            files: ['app/**/*.*',
                    'test/*.*',

                    ],
            tasks: ['mochaTest']
        }

    });

    // Dependencies

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-nodemon');
    grunt.loadNpmTasks('grunt-concurrent');

    // Run tests
    grunt.registerTask('test', [ 'mochaTest' ] );

    // Default tasks
    grunt.registerTask('default', ['concurrent:start']);
};