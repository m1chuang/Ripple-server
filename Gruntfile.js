/* global module */
module.exports = function(grunt) {
    var port = grunt.option('port') || 3000

    // Project configuration
    grunt.initConfig(
    {
        pkg: grunt.file.readJSON('package.json'),
        watch:
        {
            options: {
                spawn: false,
            },

            scripts:
            {
                files: ['api/**/*.*','client/*.js'],
                tasks: ['jshint','6to5:client','6to5:build'],
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
                build: ['Grunfile.js', 'api/**/*.*']

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
        },
        '6to5': {
            //options: {
                //modules: 'common'
            //},
            client: {
                files: [{
                    expand: true,
                    src: ['client/app.js'],
                    dest: 'dist',
                }],
            },
            build: {
                files: [{
                    expand: true,
                    src: ['api/**/*.js'],
                    dest: 'dist/',
                }],
            }
        }
    });

    // Dependencies
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-nodemon');
    grunt.loadNpmTasks('grunt-concurrent');
    grunt.loadNpmTasks('grunt-6to5');

    // Run tests
    grunt.registerTask('test', [ 'mochaTest' ] );
    grunt.registerTask('to5', [ '6to5' ] );


    grunt.registerTask('dev', '', function()
    {
        var taskList = [

            'concurrent',
            '6to5:client',
            '6to5:build',
            'nodemon',
            'watch'
        ];
        grunt.task.run(taskList);
    });
};