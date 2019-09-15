<img src="preview/appicon.png" align="left" />

# Repository Scraper

[![forthebadge](https://forthebadge.com/images/badges/made-with-javascript.svg)](https://forthebadge.com)

Repository Scraper is a collection of Grunt tasks that can be used to pull useful repository data including  
repository names, descriptions, commit and code line count, language breakdown, readme content and organizes the data in json. There are also tasks to filter repository data including abnormal data, language abbreviations 

## Tasks
### repo-load
Pulls all repository names and represents them indexed in a json array

### commits-load
Gets the commit count for each repository in the repository list

### codelines-load
Gets the code line count for each repository

### languages-load
Pulls the language breakdown for each repository in a json array i.e [ 'PHP', 'JS', 'HTML' ]

### readme-load
Gets the readme content for all repositories

### description-load
Pulls the descriptions of each repository

### find-abnormal-data
Checks each repository against a code line and language criteria and identifies any odd repository

### filter-abnormal-data
Filters and replaces any repository properties with those filters in `data-filters.json`

### filter-content
Filters and replaces readme data such as URLs and directory names 

## Getting started
### Prerequisites
- Grunt v1.01+
- JS ES6
- NodeJS

### Installation
- Clone the repository scraper repository into your project folder
```
git clone https://github.com/kyleruss/repository-scraper.git
```

- Initialize the tasks in your `Gruntfile.js`

```
module.exports = function (grunt)
{
      grunt.loadTasks('Tasks');
}
```

- Run any of the tasks via the Grunt CLI for example
```
grunt repo-load
```

- You can find the pulled repository data after executing a task in `repository-data.json`

### Repository json data structure
The repository json data is organized into a named indexed json object where each repository object is indexed by their name.  
There are several notable keys in each repository object specifically, name, link, codeLines, commits, languages and readme.

```
{
   'my-project':
   {
        'name': 'my-project',
        'link': 'https://github.com/kyleruss/my-project',
        'codeLines': 1800,
        'commits': 120,
        'languages': ['PHP', 'JS', 'HTML'],
        'readme': '<readme html content />'   
   }
}
```

# License
Repository Scraper is available under the MIT License  
See [LICENSE](LICENSE) for more details
