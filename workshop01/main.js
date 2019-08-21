//Load the required libraries
const express = require('express');
const hbs = require('express-handlebars');
const request = require('request');

//Load application keys
//Rename _keys.json file to keys.json
const keys = require('./keys.json');

//Configure the PORT
const PORT = parseInt(process.argv[2] || process.env.APP_PORT || 3000);

const WEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather';
const MAP_URL='https://maps.googleapis.com/maps/api/staticmap'
const NEWS_URL = 'https://newsapi.org/v2/top-headlines'

const makeInvocation = function(url) {
    return ((params) => 
        new Promise((resolve, reject) => {
            request.get(url, ('qs' in params? params: { qs: params }),
                (err, h, body) => {
                    if (err) 
                        return reject(err);
                    if (h.headers['content-type'].startsWith('application/json'))
                        return resolve(JSON.parse(body));
                    resolve(body);
                }
            )
        })
    );
}

const getWeather = makeInvocation(WEATHER_URL);
const getNews = makeInvocation(NEWS_URL);
const getMap = makeInvocation(MAP_URL);

//Create an instance of the application
const app = express();

//Configure handlebars
app.engine('hbs', hbs());
app.set('view engine', 'hbs');
app.set('views', __dirname + '/views');

//Route
app.get('/map', (req, resp) => {

	 // NOTE: coords hold the coordinates for the map
    const coord = {
        lat: parseFloat(req.query.lat),
        lon: parseFloat(req.query.lon)
    }

    //TODO 3/3: Add query parameters for Static Map
    //Use the exact query parameter names as keys
    //Latitude and longitude from coord object above
    //API key is in keys.map
    const params = {
    }

    getMap({ qs: params, encoding: null})
        .then(result => {
            resp.status(200);
            resp.type('image/png')
            resp.send(result);
        })
        .catch(error => {
            resp.status(400);
            resp.send(error);
        });
});

app.get('/information', (req, resp) => {

	 //Note: cityName holds the cityName, to be used
	 //in params below
    const cityName = req.query.cityName;

    //TODO 1/3: Add query parameters for OpenWeatherMap
    //Use the exact query parameter names as keys
    //Weather for city is in cityName variable
    //API key is in keys.weather
    const params = {
    }

    getWeather(params)
        .then(result => {
			   // NOTE: countryCode holds the 2 character country code
            const countryCode = result.sys.country.toLowerCase();

            //TODO 2/3: Add query parameters for News API
            //Use the exact query parameter names as keys
            //The 2 character country code is found in countryCode variable
            //API key is in keys.news
            const params = {
            }
            return (Promise.all([ result, getNews(params) ]));
        })
        .then(result => {
            resp.status(200);
            resp.format({
                'text/html': () => {
                    resp.type('text/html');
                    resp.render('information', {
                        layout: false,
                        city: cityName.toUpperCase(),
                        weather: result[0].weather,
                        temperature: result[0].main,
                        coord: result[0].coord,
                        news: result[1].articles
                    })
                },
                'application/json': () => {
                    const respond = {
                        temperature: result[0].main,
                        coord: result[0].coord,
                        city: cityName,
                        weather: result[0].weather.map(v => {
                            return {
                                main: v.main,
                                description: v.description,
                                icon: `http://openweathermap.org/img/w/${v.icon}.png`
                            }
                        })
                    }
                    resp.json(respond)
                },
                'default': () => {
                    resp.status(406);
                    resp.type('text/plain');
                    resp.send(`Cannot produce the requested representation: ${req.headers['accept']}`);
                }
            })
        })
        .catch(error => {
            resp.status(400); 
            resp.type('text/plain'); 
            resp.send(error); 
            return;
        })

});

app.get(/.*/, express.static(__dirname + '/public'));

//Start the server
app.listen(PORT, () => {
    console.info(`Application started on port ${PORT} at ${new Date()}`);
});
