/* jshint node: true, camelcase: false */
'use strict';

var fs = require('fs');

module.exports = function (grunt) {

    /* Load .jshintrc file. */
    var hintOptions = JSON.parse(fs.readFileSync('.jshintrc', 'utf8'));

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        jsfiles: [
            'Gruntfile.js',
            'index.js',
            'changesManager.js',
            'test/**/*.js'
        ],

        jsbeautifier: {
            files: ['<%= jsfiles %>'],
            options: {
                space_after_anon_function: true
            }
        },

        jshint: {
            options: hintOptions,
            files: ['<%= jsfiles %>']
        },

        mochaTest: {
            test: {
                options: {
                    reporter: 'spec'
                },
                src: ['test/**/*Spec.js']
            }
        },

        watch: {
            files: ['<%= jshint.files %>'],
            tasks: ['jsbeautifier', 'jshint']
        }
    });

    grunt.loadNpmTasks('grunt-jsbeautifier');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-mocha-test');

    grunt.registerTask('default', ['jsbeautifier', 'jshint', 'mochaTest']);
    grunt.registerTask('test', 'mochaTest');

};
