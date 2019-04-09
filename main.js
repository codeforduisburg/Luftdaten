var endpoint = 'https://maps.luftdaten.info/data/v2/data.dust.min.json';

var duisburg = [{
        latitude: 51.50,
        longitude: 6.73,
        radius: 6
    },
    {
        latitude: 51.43,
        longitude: 6.73,
        radius: 6.5
    },
    {
        latitude: 51.39,
        longitude: 6.73,
        radius: 6.5
    }
];

var getColor = function (d) {
    return d > 500 ? '#BF008E' :
        d > 100 ? '#B40C94' :
        d > 90 ? '#A9189A' :
        d > 80 ? '#9E24A1' :
        d > 70 ? '#9330A7' :
        d > 60 ? '#883CAE' :
        d > 50 ? '#7D48B4' :
        d > 40 ? '#7254BA' :
        d > 30 ? '#6760C1' :
        d > 20 ? '#5C6CC7' :
        d > 10 ? '#5178CE' :
        d > 0 ? '#4684D4' :
        '#3B91DB';
}

var duisburgCenter = {
    latitude: duisburg.reduce(function (a, c) {
        return a + c.latitude
    }, 0) / duisburg.length,
    longitude: duisburg.reduce(function (a, c) {
        return a + c.longitude
    }, 0) / duisburg.length,
};

var calcMean = function (data, index) {
    return (data.reduce(function (a, c) {
        return a + c.o[index]
    }, 0) / data.length);
}

var layers = L.tileLayer('https://{s}.tile.openstreetmap.se/hydda/full/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: 'Air quality data <a href="http://luftdaten.info" target="_blank">luftdaten.info</a> | ' +
        'Tiles courtesy of <a href="http://openstreetmap.se/" target="_blank">OpenStreetMap Sweden</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

var map = L.map('map', {
    layers: [layers],
    center: new L.LatLng(duisburgCenter.latitude, duisburgCenter.longitude),
    zoom: 12
});

var hexLayer = L.hexbinLayer({
        radius: 30,
        opacity: 0.75,
        duration: 250,
        radiusRange: [1],
    })
    .fill(function (data) {
        return getColor(calcMean(data, 2));
    })
    .hoverHandler(L.HexbinHoverHandler.tooltip({
        tooltipContent: function (data) {
            var isMean = data.length > 1 ? '~' : '';
            return (
                '<table>' +
                '<tr><th>Sensoren</th><td> ' + data.length + '</td></tr>' +
                '<tr><th>PM10</th><td>' + isMean + calcMean(data, 2).toFixed(2) + ' <small>µg/m³</small></td></tr>' +
                '<tr><th>PM2.5</th><td> ' + isMean + calcMean(data, 3).toFixed(2) + ' <small>µg/m³</small></td></tr>' +
                (data.length == 1 ? '<tr><th>Lat, Lng</th><td> @' + data[0].o[0] + ',' + data[0].o[1] + '</td></tr>' : '') +
                '<table>'
            )
        }
    }))
    .addTo(map);

var legend = L.control({
    position: 'bottomright'
});

legend.onAdd = function (map) {

    var div = L.DomUtil.create('div', 'info legend'),
        grades = [500, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0];

    for (var i = 0; i < grades.length; i++) {
        div.innerHTML +=
            '<i style="background:' + getColor(grades[i] + 1) + '" ' + (i == grades.length / 2 ? 'class="limit"' : '') + '></i> ' +
            grades[i] + (i == 0 ? '+' : i == grades.length - 1 ? ' <span>µg/m³</span>' : '') + '<br>';
    }

    return div;
};

legend.addTo(map);

// draw radius
// duisburg.forEach(d => L.circle([d.latitude, d.longitude], { radius: d.radius * 1000 }).addTo(map))

function radians(degree) {
    return parseFloat(degree) * Math.PI / 180;
}

function distance(center, location) {
    return (
        6371 * Math.acos(
            Math.cos(
                radians(center.latitude)
            ) *
            Math.cos(
                radians(location.latitude)
            ) * Math.cos(
                radians(location.longitude) - radians(center.longitude)
            ) + Math.sin(
                radians(center.latitude)
            ) * Math.sin(
                radians(location.latitude)
            )
        )
    ) <= center.radius;
}

fetch(endpoint)
    .then(function (response) {
        return response.json()
    })
    .then(function (json) {
        return json
            .filter(function (sensor) {
                return (
                    sensor.location.country == 'DE' &&
                    sensor.location.latitude != null &&
                    sensor.location.longitude != null && (
                        [
                            "HPM",
                            "PMS1003",
                            "PMS3003",
                            "PMS5003",
                            "PMS6003",
                            "PMS7003",
                            "SDS021",
                            "SDS011"
                        ].indexOf(sensor.sensor.sensor_type.name) > -1 &&
                        sensor.sensordatavalues.length >= 2
                    )
                )
            })
            .filter(function (sensor) {
                return duisburg.reduce(function (a, c) {
                    return a === true || distance(c, sensor.location)
                }, false)
            })
            .map(function (sensor) {
                var location = [
                    parseFloat(sensor.location.longitude),
                    parseFloat(sensor.location.latitude),
                    parseFloat(sensor.sensordatavalues[0].value),
                    parseFloat(sensor.sensordatavalues[1].value)
                ];
                return location;
            })
    })
    .then(function (pointData) {
        hexLayer.data(pointData);
    })