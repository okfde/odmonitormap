'use strict';
var cityURL = 'data/index.csv';

var map;

//How many cities successfully loaded
var cityCount = 0;
//How many cities according to index; allows us to tell when we are done and detect errors in data loading
var quickCityCount = 0;
//How many data sets in total
var completeCount = 0;
//List of formats
var formats = [];

/* At the moment the categories are hard coded because there is no single list of
categories, even though the same categories should be used in every file.
To save messy "unique list building", the definitive list is defined, here :) */
var categories = ['Arbeitsmarkt', 'Bevölkerung', 'Bildung und Wissenschaft', 'Haushalt und Steuern', 'Stadtentwicklung und Bebauung', 'Wohnen und Immobilien', 'Sozialleistungen', 'Öffentl. Sicherheit Gesundheit', 'Kunst und Kultur', 'Land- und Forstwirtschaft', 'Sport und Freizeit', 'Umwelt', 'Transport und Verkehr', 'Energie, Ver- und Entsorgung', 'Politik und Wahlen', 'Verwaltung', 'Gesetze und Justiz', 'Wirtschaft und Wirtschaftsförderung', 'Tourismus', 'Noch nicht kategorisiert'];

var $el = $('#map');
var windowHeight = $(window).height();
$el.height(windowHeight);

var southWest = L.latLng(46.10370875598026, 3.2299804687499996);
var northEast = L.latLng(55.7765730186677, 17.29248046875);
var bounds = L.latLngBounds(southWest, northEast);

//Initialization
$(function() {
  //kick leaflet into showing the map
  //http://stackoverflow.com/questions/10762984/leaflet-map-not-displayed-properly-inside-tabbed-panel
  $('#kartetablink').on('shown.bs.tab', function (e) {
    map.invalidateSize(false);
  })
  //make it look like the page "reloads" when clicking on links at the bottom, or,
  //rather, send page to the top so you can read content from beginning
  $('.footerlink').on('shown.bs.tab', function (e) {
    window.scrollTo(0,0);
  })
  _.each(categories, function(category) {
    $('#searchCategory').append("<option value='" + category + "'>" + category + "</option>");
  });
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

var showSearchResults = function(city, data, count) {
  <!-- NOT YET IMPLEMETNTED!!!! -->
  <!-- Remember to search within formats or process them somehow... -->
  <!-- End not yet implemented!!! -->
};

var getCityContent = function(city, marker, map) {
  //Get the city content, and if it exists, add it to the map
  var cityslug = city.kurzname;
  if (cityslug != "") {
    //Attempt to load the city data and update page data when done
    loadCity(cityslug, function(data){
      cityCount++;

      //The final decider of whether several things happen is whether the data file exists
      if (data != null) {
      _.each(data, function(d){
          if (d.Format) {
            formats.push(d.Format);
          }
        });
        $('#searchCityList').append("<option value='" + city['Stadtname'] + "'>");
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
        //Update the page
        $('.totals').html("Dieser Prototyp des Open Data Monitors umfasst zu Demonstrationszwecken zur Zeit <strong>" + cityCount + " Städte</strong> mit insgesamt <strong>" + completeCount + " Datensätzen</strong> (ohne Anspruch auf Vollständigkeit)");
        //Is this the last city?
        if (cityCount == quickCityCount) {
          console.log("cityCount reached quickCityCount, finding unique formats");
          console.log(formats);
          formats = _.uniq(formats, false, function(val) { return val.toLowerCase(); });
          console.log(formats);
          formats = _.map(formats, function(format) { return format.toLowerCase(); });
          console.log(formats);
          _.each(formats, function(format){
            //It is permissible to use a comma separated list of formats. Anything longer than 4 is, probably, such a list
            if (format.length < 5) $('#searchFormat').append("<option value='" + format + "'>" + format + "</option>");
          });
        }
        else console.log("cityCount not reached quickCityCount, not finding unique formats; if you never see the inverse of this message, something is wrong");
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
  var names = _.reject(_.pluck(data, 'kurzname'), function(val) {
    return val == "";
  });
  quickCityCount = names.length;
  _.each(data, function(d){
    if (d.Lat) {
      createMarker(d);
    }
  });

});
