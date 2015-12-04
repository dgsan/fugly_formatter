var yargs = require('yargs')
    .usage('Usage: $0 [-p|--page <page-name> [-w|--webpage]] [-c|--check] [-k|--classification] [-n|--names] [-l|--list-pages] [-h|--help]')
    .alias('c', 'check')
    .alias('p', 'page')
    .choices('p', ['participant-list', 'booklist'])
    .alias('k', 'classification')
    .alias('w', 'webpage')
    .alias('l', 'list-pages')
    .alias('n', 'names')
    .alias('h', 'help')
    .nargs('c', 0)
    .boolean('c')
    .nargs('k', 0)
    .boolean('k')
    .nargs('n', 0)
    .boolean('n')
    .nargs('w', 0)
    .boolean('w')
    .nargs('l', 0)
    .boolean('l')
    .nargs('p', 1)
    .describe('p', 'Generate page the given page.')
    .describe('c', 'Check for missing data.')
    .describe('k', 'List the classification for the data entries.')
    .describe('n', 'List org names alphabetically.')
    .describe('w', 'Generate a web page instead of an html snippet.')
    .describe('l', 'List available page snippets to generate.')
    .help('h', 'Print this message. (Remember to precompile the templates.)')
    .wrap(100);

var argv = yargs.argv;

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
        var color_class = '';
        data.info.forEach(function(item) {
            if (item.classification == "Neighborhood/Activity") {
                if (item.neighborhood_pref_1.length > 0) {
                    neighborhoods[item.neighborhood_pref_1] = item.neighborhood_pref_1;
                }
            }
        });
        for(var k in neighborhoods) {
            switch (neighborhoods[k]) {
                case 'Science in Art':
                    color_class = 'science_art_purple';
                    break;
                case 'Science of Everyday Life':
                    color_class = 'science_life_blue';
                    break;
                case 'Science of Food':
                    color_class = 'science_food_yellow';
                    break;
                case 'Science of Natural World':
                    color_class = 'science_nature_green';
                    break;
                case 'Science of Tomorrow':
                    color_class = 'science_tomorrow_fuchsia';      
                    break;
                case 'Science of You':
                    color_class = 'science_you_orange';
                    break;
                default:
                    color_class = ''
                    break;
            }
            result.push({name: neighborhoods[k], color_class: color_class});
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

    // Also have made this crudely attempt to fix/prefix urls w/o http(s):// parts.
    enlistBooks: function(neighborhoods) {
        for(var i = 0; i < neighborhoods.length; i++) {
            
            for(var j = 0; j < neighborhoods[i].organizations.length; j++) {
                neighborhoods[i].organizations[j].books = [];
                neighborhoods[i].organizations[j].organization = neighborhoods[i].organizations[j].organization_name;

                if (neighborhoods[i].organizations[j].organization_url.length > 1 &&
                    neighborhoods[i].organizations[j].organization_url.substr(0,4) != 'http') {
                    neighborhoods[i].organizations[j].organization_url = 'http://' + neighborhoods[i].organizations[j].organization_url;
                }

                if (neighborhoods[i].organizations[j].organization_facebook.length > 1 &&
                    neighborhoods[i].organizations[j].organization_facebook.substr(0,4) != 'http') {
                    neighborhoods[i].organizations[j].organization_facebook = 'http://' + neighborhoods[i].organizations[j].organization_facebook;   
                }

                if (neighborhoods[i].organizations[j].organization_twitter.length > 1 &&
                    neighborhoods[i].organizations[j].organization_twitter.substr(0,4) != 'http') {
                    neighborhoods[i].organizations[j].organization_twitter = 'http://' + neighborhoods[i].organizations[j].organization_twitter;
                }

                if (neighborhoods[i].organizations[j].organization_instagram.length > 1 &&
                    neighborhoods[i].organizations[j].organization_instagram.substr(0,4) != 'http') {
                    neighborhoods[i].organizations[j].organization_instagram = 'http://' + neighborhoods[i].organizations[j].organization_instagram;
                }

                if (neighborhoods[i].organizations[j].book_1_title.length > 0) {
                    neighborhoods[i].organizations[j].books.push({
                        title: neighborhoods[i].organizations[j].book_1_title, 
                        author: neighborhoods[i].organizations[j].book_1_author,
                        isbn: neighborhoods[i].organizations[j].book_1_isbn,
                        isbn_snip: encodeURIComponent(neighborhoods[i].organizations[j].book_1_isbn),
                        author_snip: encodeURIComponent(neighborhoods[i].organizations[j].book_1_author),
                        title_snip: encodeURIComponent(neighborhoods[i].organizations[j].book_1_title),
                    });
                }
                if (neighborhoods[i].organizations[j].book_2_title.length > 0) {
                    neighborhoods[i].organizations[j].books.push({
                        title: neighborhoods[i].organizations[j].book_2_title, 
                        author: neighborhoods[i].organizations[j].book_2_author,
                        isbn: neighborhoods[i].organizations[j].book_2_isbn,
                        isbn_snip: encodeURIComponent(neighborhoods[i].organizations[j].book_2_isbn),
                        author_snip: encodeURIComponent(neighborhoods[i].organizations[j].book_2_author),
                        title_snip: encodeURIComponent(neighborhoods[i].organizations[j].book_2_title)
                    });
                }
                if (neighborhoods[i].organizations[j].book_3_title.length > 0) {
                    neighborhoods[i].organizations[j].books.push({
                        title: neighborhoods[i].organizations[j].book_3_title, 
                        author: neighborhoods[i].organizations[j].book_3_author,
                        isbn: neighborhoods[i].organizations[j].book_2_isbn,
                        isbn_snip: encodeURIComponent(neighborhoods[i].organizations[j].book_2_isbn),
                        author_snip: encodeURIComponent(neighborhoods[i].organizations[j].book_3_author),
                        title_snip: encodeURIComponent(neighborhoods[i].organizations[j].book_3_title)
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
        
        if (argv.w) {
            if (argv.p && argv.p == 'booklist') {
                console.log(Handlebars.templates.html({neighborhoods: neighborhoods, page_name: function(){ return 'booklist';}}));
            }
            if (argv.p && argv.p == 'participant-list') {
                console.log(Handlebars.templates.html({neighborhoods: neighborhoods, page_name: function(){ return 'participant_list';}}));
            }
        } else {
            if (argv.p && argv.p == 'booklist') {
                console.log(Handlebars.templates.booklist({neighborhoods: neighborhoods}));
            }
            if (argv.p && argv.p == 'participant-list') {
                console.log(Handlebars.templates.participant_list({neighborhoods: neighborhoods}));
            }
        }
    }
};

Handlebars.registerPartial("book", Handlebars.templates.book);
Handlebars.registerPartial("booklist", Handlebars.templates.booklist);
Handlebars.registerPartial("participant_list", Handlebars.templates.participant_list);

request(config.url, function(error, response, body) {
    if (!error && response.statusCode == 200) {
        var data = JSON.parse(body);

        if (argv.c) {
            ops.check(data);
        } else if (argv.k) {
            ops.classification(data);
        } else if (argv.n) {
            ops.names(data);
        } else if (argv.l) {
            console.log("Available pages:")
            console.log();
            console.log('booklist         : Page of recommended books.');
            console.log('participant-list : Page of participants by Neighborhood and Booth.');
            console.log();
        } else if (argv.p) {
            ops.format(data);
        } else {
            var message = yargs.help();
            console.log(message);
        }

    }
});

