var request = require('request');
var async = require('async');
var parameterize = require('parameterize');

var Mongo = require('xin1/lib/db');
var Movie = require('xin1/components/movie/model');

Mongo.connect('mongodb://localhost/movie-default').then(function() {
    console.log('connected')

    request('http://www.omdbapi.com/?i=tt0499549', function (error, response, body) {
        var imdbData = JSON.parse(body);
        var movie = new Movie(imdbData);

        var newMovie = {
            title: imdbData['Title'],
            year: imdbData['Year'],
            rated: imdbData['Rated'],
            released: imdbData['Released'],
            runtime: imdbData['Runtime'],
            genres: imdbData['Genre'],
            directors: imdbData['Director'],
            writers: imdbData['Writer'],
            actors: imdbData['Actors'],
            plot: imdbData['Plot'],
            language: imdbData['Language'],
            country: imdbData['Country'],
            awards: imdbData['Awards'],
            poster: imdbData['Poster'],
            metascore: imdbData['Metascore'],
            rating: imdbData['imdbRating'],
            imdbVotes: imdbData['imdbVotes'],
            imdbId: imdbData['imdbID'],
            type: imdbData['Type'],
            slug: parameterize(imdbData['Title'])
        }

        // movie.imdbRaw = JSON.parse(body);
        movie = new Movie(newMovie);
        console.log(movie);
    });
})