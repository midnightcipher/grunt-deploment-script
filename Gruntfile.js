module.exports = function(grunt) {
 
	//
    // HELPER
    //

    /**
     * @return deployment configuration
     */
    var getDeploymentConfig = function() {
        return grunt.config('pkg.deployment');
    };

    /**
     * @return all server configuration in the deployment configuration
     */
    var getServerConfigs = function() {
        return getDeploymentConfig()['servers'];
    };

    /**
     * @return configuration of a specific server
     */
    var getServerConfig = function(name) {
        return getServerConfigs()[name];
    };

    /**
     * @return address of the selected server
     */
    var getSelectedServer = function() {
        return grunt.config('prompt.selectedServer');
    };

    /**
     * @return selected tag or branch
     */
    var getSelectedTag = function() {
        return grunt.config('prompt.selectedTag');
    };

    var getVersionFile = function() {
        return getDeploymentConfig()['versionFile'];
    };
 
	grunt.initConfig({
 
		//
        // PACKAGE CONFIG
        //
        pkg: grunt.file.readJSON('package.json'),

        //
        // BUILD CONFIG
        //
        buildDir: 'build',
        exportDir: '<%= buildDir %>/export',
        gitArchiveFile: '<%= buildDir %>/archive.zip',

        //
        // CLEAN
        //
        clean: {
            dist: ['<%= buildDir %>/*'],
            export: ['<%= exportDir %>/*']
        },

        //
        // USER INPUT
        //
        prompt: {
            /**
             * 1) Prompt the user to select the target server.
             *    The value can be accessed with "grunt.config('prompt.selectedServer')"
             * 2) Ask for confirmation if choice is 'prod'
             * 3) Prompt the user to select a tag or branch which will be deployed.
             *    The value can be accessed with "grunt.config('prompt.selectedTag')"
             */
            configure: {
                options: {
                    questions: [
                        {
                            config: 'prompt.selectedServer',
                            type: 'list',
                            message: 'Select a destination:',
                            default: function() {
                                var servers = getServerConfigs();
                                return 'test' in servers ? 'test' : '';
                            },
                            choices: function() {
                                var servers = getServerConfigs();
                                var choices = [];
                                for (name in servers) {
                                    choices.push(name);
                                }
                                return choices;
                            }
                        },
                        {
                            config: 'prompt.confirmProduction',
                            type: 'confirm',
                            message: 'Production server has been selected! Please confirm:',
                            default: false,
                            when: function(answers) {
                                return answers['prompt.selectedServer'] === 'prod';
                            }
                        },
                        {
                            config: 'prompt.selectedTag',
                            type: 'list',
                            message: 'Select a branch or tag to push:',
                            default: 'master',
                            choices: function() {
                                var choices = ['master', 'develop'];
                                // tags are retrieved by the target shell:gitListRemoteTags
                                var tags = grunt.config('gitListRemoteTags');
                                if (Array.isArray(tags)) {
                                    choices = choices.concat(tags);
                                }
                                return choices;
                            }
                        }
                    ]
                }
            },
            confirmDeploy: {
                options: {
                    questions: [{
                        config: 'prompt.confirmDeploy',
                        type: 'confirm',
                        message: 'Everything OK to execute the deployment:',
                        default: false
                    }]
                }
            }
        },

        //
        // SHELL
        //
        shell: {
            /**
             * List first 10 remote tags in the git repository in descending order.
             */
            gitListRemoteTags: {
                options: {
                    stderr: false,
                    stdout: false,
                    callback: function(err, stdout, stderr, cb) {
                        // remove leading and trailing whitespaces and split at newline
                        var tags = [];
                        if(stdout) {
                            tags = stdout.replace(/^\s+|\s+$/g, '').split('\n');
                        }
                        
                        var cleanTags = [];

                        // clean output, e.g.,
                        // input:  'dcb1398c56e5ae4bd6609a1bba26ea48c367a421        refs/tags/v1.0.0-beta'
                        // output: 'v1.0.0-beta'
                        for (i = 0; i < tags.length; i++) {
                            var tag = tags[i];
                            if (tag.indexOf('^') !== -1) {
                                continue;
                            }

                            var cleanTag = tag.split("\t")[1].replace(/^refs\/tags\//g, '');
                            cleanTags.push(cleanTag)
                        }

                        cleanTags.sort().reverse();
                        grunt.config(grunt.task.current.target, cleanTags.slice(0, 10));
                        cb();
                    }
                },
                command: function() {
                    return grunt.template.process('git ls-remote --tags');
                }
            },
            /**
             * List first 10 remote tags in the git repository in descending order.
             */
            gitExport: {
                command: function() {
                    var url = grunt.config('pkg.repository.url');
                    var tag = getSelectedTag();
                    console.log('URL: ' + url + '\nTag/Branch: ' + tag);
                    return grunt.template.process('git archive --remote=' + url + ' ' + tag + ' | tar x -C ' + grunt.config('exportDir'));
                }
            },
            /**
             * Get the exported version and write the result to the version file.
             */
            gitDescribe: {
                options: {
                    stderr: false,
                    stdout: false,
                    callback: function(err, stdout, stderr, cb) {
                        grunt.file.write(grunt.config('exportDir') + '/' + getVersionFile(), JSON.stringify({
                            version: stdout.trim(),
                            date: grunt.template.today()
                        }));
                        cb();
                    },
                },
                command: function() {
                    return grunt.template.process('git describe --long ' + getSelectedTag());
                }
            }
        },

        //
		// Replace any environment specific strings/regex
		//
		"regex-replace": {
			configs: 'needs to be configured'
		},
        //
        // RSYNC
        //
        rsync: {
            options: {
                exclude: [],
                recursive: true,
                src: '<%= exportDir %>/src/',
                dest: 'needs to be configured',
                host: 'needs to be configured'
            },
            /**
             * Dry-run of the deployment.
             */
            deployDry: {
                options: {
                    args: ['-rtvuc --dry-run'],
                }
            },
            /**
             * Live run of the deployment.
             */
            deployLive: {
                options: {
                    args: ['-rtvuc'],
                }
            }
        },
 
	});
 
	//
    // load the NPM tasks to enable the required modules
    //
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-prompt');
    grunt.loadNpmTasks('grunt-rsync');
    grunt.loadNpmTasks('grunt-shell');
	grunt.loadNpmTasks('grunt-regex-replace');
	

    //
    // Register the grunt tasks for the portals
    //

    /**
     * deploy the app
     */
    grunt.registerTask('default', ['init', 'configure', 'prepare', 'deploy', 'clean']);


    /**
     * Setup the environment to run the deployment:
     * 1) Create required folders
     */
    grunt.registerTask('init', 'Setup the environment to run the deployment', function() {
        // Create all directories required for running the grunt script
        grunt.file.mkdir(grunt.config('exportDir'));
    });


    /**
     * Prompt the user to configure the deployment.
     */
    grunt.registerTask('configure', 'Prompt the user to configure the deployment', function() {
        grunt.task.requires('init');
        grunt.task.run('shell:gitListRemoteTags', 'prompt:configure');
    });

    /**
     * Prepare the deployment:
     * 1) Checkout code from git repository
     */
    grunt.registerTask('prepare', 'Prepare the deployment', function() {
        grunt.task.requires('configure');
        grunt.task.run('shell:gitExport');
    });


    /**
     * Deploy the code to the server
     */
    grunt.registerTask('deploy', 'Deploy the code to the server', function() {
        grunt.task.requires('prepare');
        grunt.task.run('deploy.configure','regex-replace:configs','deploy.dry', 'prompt:confirmDeploy', 'deploy.live');
    });

    /**
     * Deploy the code to the server
     */
    grunt.registerTask('deploy.configure', 'Deploy the code to the server', function() {
        var deployment = getDeploymentConfig()
        var server = getServerConfig(getSelectedServer());
        grunt.config('rsync.options.host', server['user'] + '@' + server['ip']);
        grunt.config('rsync.options.dest', server['dest']);
		grunt.config('rsync.options.exclude', deployment['exclude']);
		// replace urls and other environment specific info
		grunt.config('regex-replace.configs', server['replace-configs']);
        // write version info to file
        grunt.task.run('shell:gitDescribe');
    });

    /**
     * Dry run of deploying the code to the server
     */
    grunt.registerTask('deploy.dry', 'Deploy the code to the server', function() {
        grunt.task.run('rsync:deployDry');
    });

    /**
     * Live run of deploying the code to the server
     */
    grunt.registerTask('deploy.live', 'Deploy the code to the server', function() {
        if (!grunt.config('prompt.confirmDeploy')) {
            grunt.fatal('Deployment aborted');
        }
        grunt.task.run('rsync:deployLive');
    });
 
};
