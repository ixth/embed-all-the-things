#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var cheerio = require('cheerio');
var mime = require('mime-types');

if (process.argv.length <= 2) {
    console.log('provide filename');
    process.exit();
}

processFile(process.argv[2]);

function processFile(filename) {
    var filepath = path.dirname(filename);

    function resolve(filename) {
        return path.resolve(filepath, filename.replace(/^\//, ''));
    }

    fs.readFile(filename, function (err, data) {
        if (err) {
            throw err;
        }
        var $ = cheerio.load(data, {decodeEntities: false});

        $('link[rel="stylesheet"]').each(function () {
            var url = resolve($(this).attr('href'));
            $(this).replaceWith(
                $('<style/>').text(fs.readFileSync(url))
            );
        });

        $('script[src]').each(function () {        
            var url = resolve($(this).attr('src'));
            $(this).text(fs.readFileSync(url));
            $(this).removeAttr('src');
        });

        $('img').each(function () {
            var url = resolve($(this).attr('src'));
            $(this).attr('src', embed(url));
        });

        $('[style]').each(function () {
            var style = $(this).attr('style');
            style = style.replace(/\burl\((.*?)\)/g, function (match, url) {
                return 'url(' + embed(resolve(unquot(url))) + ')';
            });
            $(this).attr('style', style);
        });

        process.stdout.write($.html());
    });
}


function unquot(filename) {
    if (/^("|')/.test(filename)) {
        return filename.replace(/^("|')(.*)\1$/g, '$2');
    }
    return filename;
}

function embed(filename) {
    var buffer = fs.readFileSync(filename);
    var mimeType = mime.lookup(filename);
    return 'data:' + mimeType + ';base64,' + buffer.toString('base64');
}