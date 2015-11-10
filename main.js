var argv = require('yargs')
    .usage('Usage: $0 [-p|--page <page-name>] [-c|--check] [-k|--classification] [-n|--names]')
    .alias('c', 'check')
    .alias('p', 'page')
    .alias('k', 'classification')
    .demand(0)
    .nargs('c', 0)
    .nargs('k', 0)
    .nargs('n', 0)
    .nargs('p', 1)
    .describe('p', 'Generate page the given page.')
    .describe('c', 'Check for missing data.')
    .describe('k', 'List the classification for the data entries.')
    .describe('n', 'List org names alphabetically.')
    .argv;

var Handlebars = require('handlebars');

require('./compiled_templates'); // Needs to be generated.

var config = require('config');

var request = require('request');

var ops = {
    classification: function(data) {
        data.info.forEach(function(organization) {
            console.log(organization.organization_name);
            console.log(organization.classification);
            console.log('');
        });
    },

    names: function(data) {
        data.info.sort(function(a, b) {
            return a.organization_name.localeCompare(b.organization_name);
        });
        data.info.forEach(function(organization) {
            console.log(organization.organization_name);
            console.log(organization.booth_desc);
            console.log('');
        });  
    },

    check: function(data) {
        var wrongCount = 0;
        data.info.forEach(function(organization) {
            if (organization.classification == "Neighborhood/Activity") {
                if (organization.organization_name.length < 1) {
                    wrongCount++;
                    console.log("No org name:");
                    console.log(organization);
                    console.log('');
                    return;
                }
      
                if (organization.book_1_title.length < 1 || organization.book_1_author.length < 1) {
                    wrongCount++;
                    console.log("No book:");
                    console.log(organization);
                    console.log('');
                    return;
                }
                
                if (organization.booth_desc.length < 1) {
                    wrongCount++;
                    console.log("No booth desc:");
                    console.log(organization);
                    console.log('');
                    return;
                }

                if (organization.neighborhood_pref_1.length < 1) {
                    wrongCount++;
                    console.log("No neighborhood pref 1:");
                    console.log(organization);
                    console.log('');
                    return;
                }
            }
        });

        if (wrongCount == 0) {
            console.log("No data problems detected.");
        }
    },

    neighborhoodExtract: function(data) {
        var result = [];
        var neighborhoods = {};
        data.info.forEach(function(item) {
            if (item.classification == "Neighborhood/Activity") {
                if (item.neighborhood_pref_1.length > 0) {
                    neighborhoods[item.neighborhood_pref_1] = item.neighborhood_pref_1;
                }
            }
        });
        for(var k in neighborhoods) {
            result.push({name: neighborhoods[k]});
        }
        return result.sort(function(a, b) {
            return a.name.localeCompare(b.name);
        });
    },

    organizationExtract: function(neighborhoods, data) {
        data.info.sort(function(a, b) {
            return a.organization_name.localeCompare(b.organization_name);
        });

        for(var i = 0; i < neighborhoods.length; i++) {
            neighborhoods[i].organizations = [];
            data.info.forEach(function(item){
                if (item.neighborhood_pref_1 == neighborhoods[i].name) {
                    neighborhoods[i].organizations.push(item);
                }
            })
        }

        return neighborhoods;
    },

    enlistBooks: function(neighborhoods) {
        for(var i = 0; i < neighborhoods.length; i++) {
            
            for(var j = 0; j < neighborhoods[i].organizations.length; j++) {
                neighborhoods[i].organizations[j].books = [];
                neighborhoods[i].organizations[j].organization = neighborhoods[i].organizations[j].organization_name;
                
                if (neighborhoods[i].organizations[j].book_1_title.length > 0) {
                    neighborhoods[i].organizations[j].books.push({
                        title: neighborhoods[i].organizations[j].book_1_title, 
                        author: neighborhoods[i].organizations[j].book_2_author
                    });
                }
                if (neighborhoods[i].organizations[j].book_2_title.length > 0) {
                    neighborhoods[i].organizations[j].books.push({
                        title: neighborhoods[i].organizations[j].book_2_title, 
                        author: neighborhoods[i].organizations[j].book_2_author
                    });
                }
                if (neighborhoods[i].organizations[j].book_3_title.length > 0) {
                    neighborhoods[i].organizations[j].books.push({
                        title: neighborhoods[i].organizations[j].book_3_title, 
                        author: neighborhoods[i].organizations[j].book_3_author
                    });
                }

            }
        }

        return neighborhoods;
    },

    format: function(data) {
        var neighborhoods = ops.neighborhoodExtract(data);
        var neighborhoods = ops.organizationExtract(neighborhoods, data);
        var neighborhoods = ops.enlistBooks(neighborhoods);
        
        console.log(Handlebars.templates.booklist({neighborhoods: neighborhoods}));
    }
};

Handlebars.registerPartial("book", Handlebars.templates.book);

request(config.url, function(error, response, body) {
    if (!error && response.statusCode == 200) {
        var data = JSON.parse(body);

        if (argv.c) {
            ops.check(data);
        } else if (argv.k) {
            ops.classification(data);
        } else if (argv.n) {
            ops.names(data);
        } else if (argv.p) {
            ops.format(data);
        } else {
            console.log("No valid option given.");
        }

    }
});

/*
*  Data structure for templates:
*
*    { neighborhoods: [
*        { name: '', organizations: [
*            { name: '', 
*              booth_description: '',
*              url: '',
*              facebook: '',
*              twitter: '',
*              instagram: ''
*              books: [
*                { title: '', author: ''}, ...
*              ]
*            }, ...
*        ]}, ...
*    ]}
*/
