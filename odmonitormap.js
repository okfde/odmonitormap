// $(function(){
  /* globals d3, $, _, L, console */
  'use strict';
  var cityURL = 'data/index.csv';

  var map;

  var nameSlugMap = {
    'Frankfurt am Main': 'frankfurt',
    'Stuttgart': 'stuttgart'
  };
  var categories = ['Arbeitsmarkt', 'Bevölkerung', 'Bildung und Wissenschaft', 'Haushalt und Steuern', 'Stadtentwicklung und Bebauung', 'Wohnen und Immobilien', 'Sozialleistungen', 'Öffentl. Sicherheit Gesundheit', 'Kunst und Kultur', 'Land- und Forstwirtschaft', 'Sport und Freizeit', 'Umwelt', 'Transport und Verkehr', 'Energie, Ver- und Entsorgung', 'Politik und Wahlen', 'Verwaltung', 'Gesetze und Justiz', 'Wirtschaft und Wirtschaftsförderung', 'Tourismus'];

  var $el = $('#map');
  var windowHeight = $(window).height();
  $el.height(windowHeight);

  var southWest = L.latLng(46.10370875598026, 3.2299804687499996);
  var northEast = L.latLng(55.7765730186677, 17.29248046875);
  var bounds = L.latLngBounds(southWest, northEast);

  map = L.map('map', {
    minZoom: 6,
    maxZoom: 8,
    maxBounds: bounds
  }).setView([51.358061573190916, 10.810546875], 6);

  var OSM_URL = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  var MB_URL = 'http://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png';

  L.tileLayer(MB_URL, {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
        '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="http://mapbox.com">Mapbox</a>',
    id: 'stefanw.map-4pdqtryz'
  }).addTo(map);

  $.getJSON('notgermany.geojson', function(feature){
    L.geoJson(feature, {
      style: {
        color: '#fff',
        fillColor: '#fff',
        weight: 1,
        opacity: 0.0,
        fillOpacity: 0.8
      }
    }).addTo(map);
  });

  var loadCity = function(cityslug, callback) {
    d3.csv('data/' + cityslug + '.csv', callback);
  };

  var showCity = function(city, data) {
    var count = 0;
    var catCount = {};
    _.each(categories, function(c){
      catCount[c] = 0;
    });
    _.each(data, function(d){
      if (d.Format) {
        count += 1;
      }
      _.each(categories, function(c){
        if (d[c]) {
          catCount[c] += 1;
        }
      });
    });
    var sortedCategories = _.sortBy(_.pairs(catCount), function(x){
      return x[1];
    });
    sortedCategories = _.filter(sortedCategories, function(x){ return x[1] > 0; });
    sortedCategories = sortedCategories.reverse();
    var html = [];
    html.push('<h2>' + city.Stadtname + '</h2>');
    html.push('<p>Datensätze gesamt: ' + count + '</p>');
    html.push('<h3>Kategorien</h3>');
    html.push('<ul>');
    _.each(sortedCategories, function(x){
      html.push('<li>' + x[0] + ': ' + x[1] + '</li>');
    });
    html.push('</ul>');
    return html.join('');
  };

  var getCityContent = function(city, marker) {
    var cityslug = nameSlugMap[city.Stadtname];
    loadCity(cityslug, function(data){
      console.log(data);
      marker.bindPopup('<h2>' + city.Stadtname + '</h2>', {
        maxHeight: windowHeight,
        autoPan: false,
        closeButton: false
      }).on('popupopen', function(){
        $('#infobox').html(showCity(city, data));
      });
    });
  };

  var createMarker = function(d) {
    var lat = parseFloat(d.Lat, 10);
    var lon = parseFloat(d.Lon, 10);
    var marker = L.marker([lat, lon]).addTo(map);
    console.log(d);
    getCityContent(d, marker);
  };


  d3.csv(cityURL, function(data){
    _.each(data, function(d){
      if (d.Lat) {
        createMarker(d);
      }
    });

  });
// });