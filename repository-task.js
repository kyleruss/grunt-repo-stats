module.exports = function(grunt)
{
    var request = require('request');
    var fs = require('fs');
    var config = require('./api-config.json');
    var filters = require('./data-filters.json');

    var repoData = {};

    var githubUsername = "YOUR_GITHUB_USERNAME";
    var userApiUrl = `https://api.github.com/users/${githubUsername}/`;
    var repoApiUrl = `https://api.github.com/repos/${githubUsername}/`;
    var apiContentUrl = `https://raw.githubusercontent.com/${githubUsername}/`;
    var repoDataFile = "repository-data.json";

    var COMMITS_TASK = 0,
        CODE_TASK = 1,
        LANGUAGES_TASK = 2,
        README_TASK = 3,
        REPO_TASK = 4;
    
    
    function loadRepoDataFile()
    {
        return new Promise((resolve, reject) =>
        {
            fs.readFile(repoDataFile, 'utf-8', (err, data) =>
            {
                if(err) 
                {
                    console.log('Repo data file load error: ' + err);
                    reject(err);
                }

                else
                {
                    if(data != null && data.length > 0)
                        repoData = JSON.parse(data);

                    resolve();
                }
            });
        });
    };

    function saveRepoDataFile(callback)
    {
        var repoJsonStr = JSON.stringify(repoData);
        fs.writeFile(repoDataFile, repoJsonStr, 'utf-8', callback);
    };

    function getHeaders(apiNodeUrl)
    {
        var authTokenStr = "token " + config.authToken;
        var headers = 
        {
            url: apiNodeUrl, 
            json: true,
            headers: { 'User-Agent': 'request', 'Authorization': authTokenStr }
        };

        return headers;
    }

    function callApi(apiNodeUrl, callback, options)
    {
        if (options == null) 
            options = getHeaders(apiNodeUrl);

        return new Promise((resolve, reject) =>
        {
            request(options, (err, res, data) =>
            {
                if(err || res.statusCode != 200)
                {
                    console.log('[Error] Status-code: ' + res.statusCode + ' Url: ' + apiNodeUrl);
                    
                    if(res.statusCode == 202)
                    {
                        resolve();
                        callback(null, res.statusCode);
                    }

                    else reject();
                }

                else
                {
                    resolve();
                    callback(data, res.statusCode);
                }
            });
        });
    };

    function getApiUrl(repoName, type)
    {
        var url;

        switch(type)
        {
            case COMMITS_TASK:
                url = repoApiUrl + repoName + "/contributors";
                break;

            case CODE_TASK:
                url = repoApiUrl + repoName + "/stats/contributors";
                break;

            case LANGUAGES_TASK:
                url = repoApiUrl + repoName + "/languages";
                break;

            case README_TASK:
                url = repoApiUrl + repoName + "/readme";
                break;

            case REPO_TASK:
                url = userApiUrl + "repos";
                break; 
        }

        return url;
    };
    
    async function runTask(task, singleExec, taskScope)
    {
        var done = taskScope.async();

        await loadRepoDataFile();
        console.log('[Repository Data File] Loaded');
        console.log('[Task Processing] Begin');

        if(singleExec) await task();
        else
        {
            for(var index in repoData)
                await task(index);
        }

        console.log('[Task Processing] Done');
        await saveRepoDataFile(() =>
        {
            console.log('[Repository Data File] Saved');
            done();
        });  
    };

    function getRepoProperty(index, propName)
    {
        if(repoData == null || repoData.length == 0) return null;
        else return index == null? 
             repoData[propName] : repoData[index][propName];
    }

    function setRepoProperty(index, propName, propValue)
    {
        if(repoData != null)
        {
            if(index == null)
                repoData[propName] = propValue;
            else
                repoData[index][propName] = propValue;
        }
    }

    function getRepositories()
    {
        return callApi(getApiUrl(null, REPO_TASK), (data, status) =>
        {
            data.forEach((repoItem) =>
            {
                var repoName = repoItem.name;
                var repoLink = repoItem.html_url;
                var repoObj = { name: repoName, link: repoLink };
                
                if(getRepoProperty(null, repoName) == null)
                    setRepoProperty(null, repoName, repoObj);
            });
        });
    };

    function getRepositoryCommits(index)
    {
        return callApi(getApiUrl(index, COMMITS_TASK), (data, status) =>
        {
            var commits = data[0].contributions;
            setRepoProperty(index, "commits", commits);
        });
    };

    function getRepositoryCodeLines(index)
    {
        return callApi(getApiUrl(index, CODE_TASK), (data, status) =>
        {
            if(status == 200)
            {
                var weeks = data[0].weeks;
                var total = 0;

                weeks.forEach(function(week)
                {
                    var additions = week.a;
                    total += additions;
                });

                setRepoProperty(index, "codeLines", total);
            }
        });
    };

    function getRepositoryLanguages(index)
    {
        return callApi(getApiUrl(index, LANGUAGES_TASK), (data, status) =>
        {
            var languageData = Object.keys(data);
            setRepoProperty(index, "languages", languageData);
        });
    };

    function getRepositoryReadme(index)
    {
        var readmeApiUrl = getApiUrl(index, README_TASK);
        var options = getHeaders(readmeApiUrl);
        options['headers']['Accept'] = 'application/vnd.github.VERSION.html';

        return callApi(readmeApiUrl, (data, status) => 
        {
            setRepoProperty(index, "readme", data);

        }, options);
    };

    function getRepositoryDescriptions()
    {
        return callApi(getApiUrl(null, REPO_TASK), (data, status) =>
        {
            data.forEach((repoItem) =>
            {
                var repoName = repoItem.name;
                var repoDesc = repoItem.description;

                setRepoProperty(repoName, "description", repoDesc);
            });
        });
    };


    function findAbnormalData(index)
    {
        var repoLanguages = getRepoProperty(index, "languages");
        var repoCodeLines = getRepoProperty(index, "codeLines");
        var langLength = repoLanguages.length;

        if(langLength > 3)
            console.log("[Abnormal Languages Length] Repository: " + index + " Languages: " + JSON.stringify(repoLanguages));
        
        if(repoCodeLines > 100000)
            console.log("[Abnormal Code Length] Repository: " + index + " Code length: " + repoCodeLines);
    };

    function filterAbnormalData()
    {
        for(var filterRepoName in filters["repo-filters"])
        {
            var filterObj = filters["repo-filters"][filterRepoName];
            for(var filterProperty in filterObj)
            {
                var filterValue = filterObj[filterProperty];
                setRepoProperty(filterRepoName, filterProperty, filterValue);
            }
        }
    };

    function filterContent(index)
    {
        var dataFilters = filters["language-filters"];
        var languages = getRepoProperty(index, "languages");
        
        Object.keys(dataFilters).forEach((filterName) =>
        {
            var langIndex = languages.indexOf(filterName);
            if(langIndex != -1)
                repoData[index]["languages"][langIndex] = dataFilters[filterName];
        });

        var contentUrl = apiContentUrl + index + "/master/";
        var readme = getRepoProperty(index, "readme");
        var imageFiltered = readme.replace(/src="preview/gi, 'src="' + contentUrl + "/preview");
        var licenseFiltered	= imageFiltered.replace(/href="LICENSE/gi, 'href="' + contentUrl + "/LICENSE");
        
        setRepoProperty(index, "readme", licenseFiltered);
    }

    grunt.registerTask('repo-load', function()
    {
        runTask(getRepositories, true, this);
    });

    grunt.registerTask('commits-load', function()
    {
        runTask(getRepositoryCommits, false, this);
    });

    grunt.registerTask('codelines-load', function()
    {
        runTask(getRepositoryCodeLines, false, this);
    });

    grunt.registerTask('languages-load', function()
    {
        runTask(getRepositoryLanguages, false, this);
    });

    grunt.registerTask('readme-load', function()
    {
        runTask(getRepositoryReadme, false, this);
    });

    grunt.registerTask('description-load', function()
    {
        runTask(getRepositoryDescriptions, true, this);
    });

    grunt.registerTask('find-abnormal-data', function()
    {
        runTask(findAbnormalData, false, this);
    });

    grunt.registerTask('filter-abnormal-data', function()
    {
        runTask(filterAbnormalData, true, this);
    });

    grunt.registerTask('filter-content', function()
    {
        runTask(filterContent, false, this); 
    });
};