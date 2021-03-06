'use strict';
var cityURL = 'data/index.csv';

var map;

//How many cities successfully loaded
var cityCount = 0;
//List of all cities for search box
var listOfCities = [];
//How many cities according to index; allows us to tell when we are done and detect errors in data loading
var quickCityCount = 0;
//How many data sets in total
var completeCount = 0;
//List of formats
var formats = [];
//List of licences
var licences = [];
//Complete data set in one array
var allData = [];

/* The definitive list if categories is defined, here. It should match the set defined in metautils.py. */
var categories = ['Bevölkerung', 'Bildung und Wissenschaft', 'Geographie, Geologie und Geobasisdaten', 'Gesetze und Justiz', 'Gesundheit', 'Infrastruktur, Bauen und Wohnen', 'Kultur, Freizeit, Sport, Tourismus', 'Politik und Wahlen', 'Soziales', 'Transport und Verkehr', 'Umwelt und Klima', 'Verbraucherschutz', 'Öffentliche Verwaltung, Haushalt und Steuern', 'Wirtschaft und Arbeit', 'Sonstiges', 'Noch nicht kategorisiert'];

var $el = $('#map');
var windowHeight = $(window).height();
$el.height(windowHeight);

var southWest = L.latLng(46.10370875598026, 3.2299804687499996);
var northEast = L.latLng(55.7765730186677, 17.29248046875);
var bounds = L.latLngBounds(southWest, northEast);

//Initialization
$(function() {
  $('.btn').button();
  $('.btn').on('change', function (e) {
    if ($('#cityoptionall').attr('checked') == 'checked') $('#searchCity').attr('disabled', 'disabled');
    else $('#searchCity').removeAttr('disabled');
  });
  
  $('.selectall').on('click', function (e) {
    switch(e.target.id) {
      case 'saformats':
        $('.sfoptions').attr('selected', 'selected');
        break;
      case 'salicences':
        $('.sloptions').attr('selected', 'selected');
        break;
      case 'sacategories':
        $('.scoptions').attr('selected', 'selected');
        break;
    }
  });
  
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
    $('#searchCategory').append("<option class=\"scoptions\" selected value='" + category + "'>" + category + "</option>");
  });
  
  $('#searchButton').on('click', submitSearch);
  $('#searchForm').on('submit', submitSearch);
  
  
  
});

function submitSearch(e) {
  e.preventDefault();
  
  var filter = {
    Stadtname: $('#searchCity').val(), 
    Kategorien: $('#searchCategory').val(), 
    Lizenzen: $('#searchLicence').val(), 
    Formate: $('#searchFormat').val(),
    Quellen: $('#searchSource').val() 
  };
  
  $('#searchResults').html(showSearchResults(filter));
}

map = L.map('map', {
  minZoom: 6,
  maxZoom: 12,
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
      color: '#ddd',
      fillColor: '#ddd',
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
  html.push('<p>Datensätze gesamt: ' + count + ' (Stand: ' + city.modified + ')</p>');
  html.push('<p><strong>Quellen</strong>');
  if (+city['sourced-from-d'] > 0) html.push('<br>Datenkatalog: ' + city['sourced-from-d']);
  if (city['catalog-sources'] !== "") html.push(' (' + city['catalog-sources'] + ')');
  if (+city['sourced-from-c'] > 0) html.push('<br>Crawl: ' + city['sourced-from-c']);
  if (+city['sourced-from-g'] > 0) html.push('<br>Google: ' + city['sourced-from-g']);
  if (+city['sourced-from-b'] > 0) html.push('<br>Bing: ' + city['sourced-from-b']);
  if (+city['sourced-from-m'] > 0) html.push('<br>Manuell: ' + city['sourced-from-m']);
  html.push('<br><br><a href="#" data-toggle="modal" data-target="#myModal">Mehr über die Zahlen</a>');
  html.push('<h3>Themen</h3>');
  html.push('<ul>');
  _.each(sortedCategories, function(x){
    html.push('<li><a class="open-list" href="#">' + x[0] + ': ' + x[1] + '</a><ul style="display:none">');
    _.each(data, function(d){
      if (d[x[0]]) {
        var trimmedUrl = $.trim(d['URL']);
        var formatText = ""
        if (d.Format) {
          formatText = ' (' + d.Format + ')';
        }
        var hrefText = d['Dateibezeichnung'] + formatText;
        if (trimmedUrl !== '') {
          hrefText = '<a href="' + $.trim(d['URL']) + '">' + hrefText + '</a>'; 
        } 
        html.push('<li>' + hrefText + '</li>');
      }
    });
    html.push('</ul></li>');
  });
  html.push('</ul>');
  return html.join('');
};

/* The filter is passed this way because I like the idea of just applying a filter to 
the data. But it's not that easy: city is a single value, license multiple, category and
format are multiple to multiple matches, format being done as a comma-separated list and
categories as boolean values... but at least it's sort of consistent with the CSV 
column names */
var showSearchResults = function(filter) {
  var trimmedCity = $.trim(filter['Stadtname']);
  
  var finalData = _.filter(allData, function(entry) {
    return (
      (($('#cityoptionall').attr('checked') == 'checked')
      || _.find(filter['Stadtname'], function (val) {
        return val.toLowerCase() == entry['Stadtname'].toLowerCase();
      }))
      && _.find(filter['Kategorien'], function (val) {
        return ($.trim(entry[val]).toLowerCase() == "x");
      })
      && _.find(filter['Lizenzen'], function (val) {
        return val.toLowerCase() == entry['Lizenz'].toLowerCase();
      })
      && _.find(filter['Formate'], function (val) {
        return (entry['Format'].toLowerCase().indexOf(val) > -1);
      })
      && _.find(filter['Quellen'], function (val) {
        console.log(entry);
        return (entry['Quelle'].toLowerCase().indexOf(val) > -1);
      })
    );
  });
  var rstr = "<ul>";
  if (finalData.length == 0) {
    if ((trimmedCity == "") && ($('#cityoptionall').attr('checked') != 'checked')) rstr += "<li>Bitte eine Gemeinde angeben</li>";
    if (filter['Kategorien'].length == 0) rstr += "<li>Bitte mindestens eine Kategorie angeben</li>";
    if (filter['Formate'].length == 0) rstr += "<li>Bitte mindestens einen Dateiformat angeben</li>";
    if (filter['Quellen'].length == 0) rstr += "<li>Bitte mindestens eine Quelle angeben</li>";
    if (filter['Lizenzen'].length == 0) rstr += "<li>Bitte mindestens einen Lizenz angeben</li>";
  }
  rstr += "</ul>";
  rstr += "<br />Suche ergab " + finalData.length + " Treffer<br><br>";

  if ($('#cityoptionall').attr('checked') == 'checked') {
    finalData = _.groupBy(finalData, 'Stadtname');
    _.each(finalData, function(citydataset, key) {
      rstr += '<h3>' + key + '</h3>'
      _.each(citydataset, function(dataset) {
        rstr += '<a href="' + $.trim(dataset['URL']) + '">' + dataset['Dateibezeichnung'] + '</a><br>';
      });
    });
  }
  else {
    finalData = _.sortBy(finalData, 'Dateibezeichnung');
    finalData = _.sortBy(finalData, 'Stadtname');
    _.each(finalData, function(dataset) {
      rstr += '<a href="' + $.trim(dataset['URL']) + '">' + dataset['Dateibezeichnung'] + '</a><br>';
    });
  }
  
  
  
  return rstr;
};

var getCityContent = function(city, marker, map) {
  //Get the city content, and if it exists, add it to the map
  var cityslug = city.kurzname;
  if (cityslug != "") {
    console.log("Trying to load " + city.kurzname);
    //Attempt to load the city data and update page data when done
    loadCity(cityslug, function(data){
      cityCount++;
      listOfCities.push(city['Stadtname']);

      //The final decider of whether several things happen is whether the data file exists
      if (data != null) {
        _.each(data, function(d){
          if (d.Format) {
            formats.push(d.Format);
          }
          if (d.Lizenz) {
            licences.push(d.Lizenz);
          }
          d['Stadtname'] = city['Stadtname'];
          allData.push(d);
        });
        var count = 0;
        _.each(data, function(d){
          if (d.URL) {
            count += 1;
          }
        });
        completeCount += count;
        
        var emailContent = "";
        if ($.trim(city['Kontakt Mail']).length > 0) emailContent = "<li>Kontakt: <a href=\"mailto:"+city['Kontakt Mail']+"\">"+city['Kontakt Mail']+"</a></li>";
        var opendataportal = "";
        if ($.trim(city['Open Data Portal']).length > 0) opendataportal = "<br>Datenkatalog: <a href=\""+city['Open Data Portal']+"\">"+city['Open Data Portal']+"</a>";
        var portal = "";
        if ($.trim(city['DOMAIN']).length > 0) portal = 'Portal: <a href=\"' + city.DOMAIN + '\">' + city.DOMAIN + '</a>'
        marker.bindPopup('<h2>' + city.Stadtname + '</h2><ul><li>' + count + ' Datensätze (Stand: ' + city.modified + ')' + emailContent + '</ul>' + portal + opendataportal, {
          maxHeight: windowHeight
        }).on('popupopen', function() {
          $('#infobox').html(showCity(city, data, count));
        });
        marker.bindLabel(city.Stadtname, {
          className: 'labelClass'
        });
        console.log("Finished " + city.Stadtname);
        marker.addTo(map);
        //Update the page
        $('.totals').html("Der Prototyp der Open-Data-Landkarte wurde am 19.12.2014 zum letzten Mal aktualisiert und umfasst zu Demonstrationszwecken <strong>" + cityCount + " Organisationen</strong> mit insgesamt <strong>" + completeCount + " Datensätzen</strong> (ohne Anspruch auf Vollständigkeit). <small>Wichtig: nicht alle hier angezeigten Datensätze sind offen! Aktualisierte Daten werden auf <a href='http://beta.offenedaten.de/'>beta.offenedaten.de</a> bereitgestellt. Dort kann nach offenen und nicht offenen Datensätzen gefiltert werden.</small>")
        //Is this the last city?
        if (cityCount == quickCityCount) {
          console.log("cityCount reached quickCityCount, finding unique formats, licenses, creating city list");
          //Get rid of most duplication
          formats = _.uniq(formats, false, function(val) { return val.toLowerCase(); });
          //Convert to lower case
          formats = _.map(formats, function(format) { return format.toLowerCase(); });
          //It is permissible to use a comma separated list of formats: convert such lists into one long list
          var expandedFormats = [];
          _.each(formats, function(format){
            var formatList = format.split(',');
            _.each(formatList, function(item) {
              var trimmedFormat = $.trim(item);
              expandedFormats.push(trimmedFormat);
            });
          });
          //Once again
          formats = _.uniq(expandedFormats);
          //And finally
          _.each(formats, function(format){
            $('#searchFormat').append("<option class=\"sfoptions\" selected value='" + format + "'>" + format + "</option>");
          });
          //Licences are simpler
          licences = _.uniq(licences, false, function(val) { return val.toLowerCase(); });
          _.each(licences, function(licence){
            $('#searchLicence').append("<option class=\"sloptions\" selected value='" + licence + "'>" + licence + "</option>");
          });
          listOfCities.sort();
          _.each(listOfCities, function(cityname){
            $('#searchCity').append("<option value='" + cityname + "'>" + cityname + "</option>");
          });
        }
        else console.log("cityCount not reached quickCityCount, not finding unique formats; if you never see the inverse of this message, something is wrong");
      }
    });
  }
};

var gicon = L.MakiMarkers.icon({icon: "polling-place", color: "#0c0", size: "s"});
var bicon = L.MakiMarkers.icon({icon: "polling-place", color: "#665", size: "s"});

var createMarker = function(d) {
  var lat = parseFloat(d.Lat, 10);
  var lon = parseFloat(d.Lon, 10);
  if ((d['type'].toLowerCase().indexOf('stadt') != -1) || (d['type'] == '')) {
    //It's a 'city'
    var marker = L.marker([lat, lon], {icon: gicon});
  }
  else {
    var marker = L.marker([lat, lon], {icon: bicon});
  }
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
