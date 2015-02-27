/* global module */
module.exports = function(grunt) {
    var port = grunt.option('port') || 3000

    // Project configuration
    grunt.initConfig(
    {
        pkg: grunt.file.readJSON('package.json'),

        jshint: {

                options:
                {
                    reporter: require('jshint-stylish'), // use jshint-stylish to make our errors look and read good
                    force:true,
                    undef:true,
                    node:true
                },
                build: ['Grunfile.js', 'src/api/**/*.*']

        },
        mochaTest:
        {
            test:
            {
                options:
                {
                    reporter: 'spec',
                    clearRequireCache: true
                },
                src: ['test/*.js']
            }
        },
        nodemon:
        {
            dev:
            {
                script: 'api.js',
                options:
                {
                    callback: function (nodemon) {
                        nodemon.on('log', function (event) {
                          console.log(event.colour);
                        });
                      },
                    delay: 500,
                    ignore: ['node_modules/**','src/**'],
                    watch: ['dist/**','api.js','api-config.json']
                }
            }
        },
        concurrent: {
            dev:{
                tasks:[ 'nodemon', 'watch'],
                options:{ logConcurrentOutput: true}
            },
            test:{
                tasks:[ 'mochaTest', 'nodemon', 'watch'],
                options:{ logConcurrentOutput: true}
            }
        },
       'babel': {
            options: {
                sourceMap: true
            },
            dist: {
                expand:true,
                cwd:'src',
                src: ['api/**/*.js','client/*.js'],
                dest: 'dist',
                ext:'.js'
            }
        },
         watch:
        {
            options: {spawn: false},
            scripts:{
                files: ['src/**/*.js'],
                tasks: ['jshint','babel']
            }
        }
    });

    // Dependencies
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-nodemon');
    grunt.loadNpmTasks('grunt-concurrent');
    grunt.loadNpmTasks('grunt-babel');

    // Run tests
    grunt.registerTask('test', [ 'mochaTest' ] );


    grunt.registerTask('dev', '', function()
    {
        grunt.task.run([
            'jshint',
            'babel',
            'concurrent:dev'
        ]);
    });
};