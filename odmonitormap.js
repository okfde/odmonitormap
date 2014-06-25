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

  //Magical pieces of javascript to kick leaflet into showing the map
  //http://stackoverflow.com/questions/10762984/leaflet-map-not-displayed-properly-inside-tabbed-panel
  //and make it look like the page "reloads" when clicking on links at the bottom, or,
  //rather, send page to the top so you can read content from beginning
  $(function() {
    $('#kartetablink').on('shown.bs.tab', function (e) {
      map.invalidateSize(false);
    })
    $('.footerlink').on('shown.bs.tab', function (e) {
      window.scrollTo(0,0);
    })
  });

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
  
  //How many cities
  var cityCount = 0;
  //How many data sets in total
  var completeCount = 0;

  var getCityContent = function(city, marker, map) {
    //Get the city content, and if it exists, add it to the map
    var cityslug = city.kurzname;
    if (cityslug != "") {
      //Attempt to load the city data and update page data when done
      loadCity(cityslug, function(data){
        //The final decider of whether to show a marker is whether the data file exists,
        //but we could also do it based on GID in the index and prevent execution of this
        //code. Prevention currently occurs earlier if there is no short name, but at some
        //point we might enter them all regardless of whether we have data
        if (data != null) {
          var count = 0;
          _.each(data, function(d){
            if (d.Format) {
              count += 1;
            }
          });
          completeCount += count;
          
          var emailContent = "";
          if (city['Kontakt Mail'] !== undefined) emailContent = "<li>Kontakt: <a href=\"mailto:"+city['Kontakt Mail']+"\">"+city['Kontakt Mail']+"</a></li>";
          marker.bindPopup('<h2>' + city.Stadtname + '</h2><ul><li><a href=\"' + city.DOMAIN + '\">' + city.DOMAIN + '</a></li><li>' + count + ' Datensätze' + emailContent + '</ul>', {
            maxHeight: windowHeight
          }).on('popupopen', function(){
            $('#infobox').html(showCity(city, data, count));
          });
          
          marker.addTo(map);
          cityCount++;
          
          //Update the page
          $('.totals').html("Dieser Prototyp des Open Data Monitors umfasst zu Demonstrationszwecken zur Zeit <strong>" + cityCount + " Städte</strong> mit insgesamt <strong>" + completeCount + " Datensätzen</strong> (ohne Anspruch auf Vollständigkeit)");
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
