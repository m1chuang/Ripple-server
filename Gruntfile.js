/* global module */
module.exports = function(grunt) {
    var port = grunt.option('port') || 3000

    // Project configuration
    grunt.initConfig(
    {
        pkg: grunt.file.readJSON('package.json'),
        watch:
        {
            scripts:
            {
                files: ['app/**/*.*'],
                tasks: ['jshint'],
            }
        },
        jshint: {

                options:
                {
                    reporter: require('jshint-stylish'), // use jshint-stylish to make our errors look and read good
                    force:true,
                    undef:true,
                    node:true
                },
                build: ['Grunfile.js', 'app/**/*.*']

        },
        mochaTest:
        {
            test:
            {
                options:
                {
                    reporter: 'spec'
                },
                src: ['test/*.js']
            }
        },
        nodemon:
        {
            dev:
            {
                options:
                {
                    script: './main.js',
                    ignore: ['node_modules/**']
                }
            }
        },
        concurrent: {
            dev:
            {
                tasks: ['jshint', 'nodemon', 'watch'],
                options:
                {
                    logConcurrentOutput: true
                }
            },
            test:
            {
                tasks: ['mochaTest', 'nodemon', 'watch'],
                options:
                {
                    logConcurrentOutput: true
                }
            }
        }
    });

    // Dependencies
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-nodemon');
    grunt.loadNpmTasks('grunt-concurrent');

    // Run tests
    grunt.registerTask('test', [ 'mochaTest' ] );


    grunt.registerTask('dev', '', function()
    {
        var taskList = [

            'concurrent',
            'jshint:dev',
            'nodemon',
            'watch'
        ];
        grunt.task.run(taskList);
    });
};