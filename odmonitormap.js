// $(function(){
  /* globals d3, $, _, L, console */
  'use strict';
  var cityURL = 'data/index.csv';

  var map;

  var categories = ['Arbeitsmarkt', 'Bevölkerung', 'Bildung und Wissenschaft', 'Haushalt und Steuern', 'Stadtentwicklung und Bebauung', 'Wohnen und Immobilien', 'Sozialleistungen', 'Öffentl. Sicherheit Gesundheit', 'Kunst und Kultur', 'Land- und Forstwirtschaft', 'Sport und Freizeit', 'Umwelt', 'Transport und Verkehr', 'Energie, Ver- und Entsorgung', 'Politik und Wahlen', 'Verwaltung', 'Gesetze und Justiz', 'Wirtschaft und Wirtschaftsförderung', 'Tourismus', 'Noch nicht kategorisiert'];

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

  // var OSM_URL = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
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

  var showCity = function(city, data, count) {
    var catCount = {};
    _.each(categories, function(c){
      catCount[c] = 0;
    });
    _.each(data, function(d){
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
    console.log(sortedCategories)
    sortedCategories = sortedCategories.reverse();
    var html = [];
    html.push('<h2>' + city.Stadtname + '</h2>');
    html.push('<p>Datensätze gesamt: ' + count + '</p>');
    html.push('<h3>Themen</h3>');
    html.push('<ul>');
    _.each(sortedCategories, function(x){
      html.push('<li><a class="open-list" href="#">' + x[0] + ': ' + x[1] + '</a><ul style="display:none">');
      _.each(data, function(d){
        if (d[x[0]] && d.Format) {
          html.push('<li><a href="' + d['URL Datei'] + '">' + d['Dateibezeichnung'] + ' (' + d.Format + ')</a></li>');
        }
      });
      html.push('</ul></li>');
    });
    html.push('</ul>');
    return html.join('');
  };

  var getCityContent = function(city, marker, map) {
    //Get the city content, and if it exists, add it to the map
    var cityslug = city.kurzname;
    if (cityslug != "") {
      loadCity(cityslug, function(data){
        if (data != null) {
          var count = 0;
          _.each(data, function(d){
            if (d.Format) {
              count += 1;
            }
          });
          var emailContent = "";
          if (city['Kontakt Mail'] !== undefined) emailContent = "<li>Kontakt: <a href=\"mailto:"+city['Kontakt Mail']+"\">"+city['Kontakt Mail']+"</a></li>";
          marker.bindPopup('<h2>' + city.Stadtname + '</h2><ul><li><a href=\"' + city.DOMAIN + '\">' + city.DOMAIN + '</a></li><li>' + count + ' Datensätze' + emailContent + '</ul>', {
            maxHeight: windowHeight
          }).on('popupopen', function(){
            $('#infobox').html(showCity(city, data, count));
          });
          marker.addTo(map);
        }
      });
    }
  };

  var createMarker = function(d) {
    var lat = parseFloat(d.Lat, 10);
    var lon = parseFloat(d.Lon, 10);
    var marker = L.marker([lat, lon]);
    getCityContent(d, marker, map);
  };

  $(document).on('click', '.open-list', function(e){
    e.preventDefault();
    $(this).next().toggle();
  });


  d3.csv(cityURL, function(data){
    _.each(data, function(d){
      if (d.Lat) {
        createMarker(d);
      }
    });

  });
// });
