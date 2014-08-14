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
//List of licences
var licences = [];
//Complete data set in one array
var allData = [];

/* At the moment the categories are hard coded because there is no single list of
categories, even though the same categories should be used in every file.
To save messy "unique list building", the definitive list is defined, here :) */
var categories = ['Arbeitsmarkt', 'Bevölkerung', 'Bildung und Wissenschaft', 'Haushalt und Steuern', 'Stadtentwicklung und Bebauung', 'Wohnen und Immobilien', 'Sozialleistungen', 'Öffentl. Sicherheit', 'Gesundheit', 'Kunst und Kultur', 'Land- und Forstwirtschaft', 'Sport und Freizeit', 'Umwelt', 'Transport und Verkehr', 'Energie, Ver- und Entsorgung', 'Politik und Wahlen', 'Verwaltung', 'Gesetze und Justiz', 'Wirtschaft und Wirtschaftsförderung', 'Tourismus', 'Verbraucher', 'Sonstiges', 'Noch nicht kategorisiert'];

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
        var link = $.trim(d['URL Datei']);
        var parent = $.trim(d['URL PARENT']);
        if (link.length == 0) {
          if (parent.length != 0) {
            link = parent;
          }
          else return; //=continue
        }
        html.push('<li><a href="' + link + '">' + d['Dateibezeichnung'] + ' (' + d.Format + ')</a></li>');
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
    if (trimmedCity == "") rstr += "<li>Bitte eine Gemeinde angeben</li>";
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
        //This code is a copy of that above, but it will all
        //be removed soon as the data will be preprocessed
        var link = $.trim(dataset['URL Datei']);
        var parent = $.trim(dataset['URL PARENT']);
        if (link.length == 0) {
          if (parent.length != 0) {
            link = parent;
          }
          else return; //=continue
        }
        rstr += '<a href="' + link + '">' + dataset['Dateibezeichnung'] + '</a><br>';
      });
    });
  }
  else {
    finalData = _.sortBy(finalData, 'Dateibezeichnung');
    finalData = _.sortBy(finalData, 'Stadtname');
    _.each(finalData, function(dataset) {
        //This code is a copy of that above, but it will all
        //be removed soon as the data will be preprocessed
        var link = $.trim(dataset['URL Datei']);
        var parent = $.trim(dataset['URL PARENT']);
        if (link.length == 0) {
          if (parent.length != 0) {
            link = parent;
          }
          else return; //=continue
      }
      rstr += '<a href="' + dataset['URL Datei'] + '">' + dataset['Dateibezeichnung'] + '</a><br>';
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
        $('#searchCity').append("<option value='" + city['Stadtname'] + "'>" + city['Stadtname'] + "</option>");
        var count = 0;
        _.each(data, function(d){
          if (d.Format) {
            count += 1;
          }
        });
        completeCount += count;
        
        var emailContent = "";
        if (city['Kontakt Mail'] !== undefined) emailContent = "<li>Kontakt: <a href=\"mailto:"+city['Kontakt Mail']+"\">"+city['Kontakt Mail']+"</a></li>";
        var opendataportal = "";
        if (city['Open Data Portal'] !== undefined) opendataportal = "<br>Open Data: <a href=\""+city['Open Data Portal']+"\">"+city['Open Data Portal']+"</a>";
        marker.bindPopup('<h2>' + city.Stadtname + '</h2><ul><li>' + count + ' Datensätze' + emailContent + '</ul>Portal: <a href=\"' + city.DOMAIN + '\">' + city.DOMAIN + '</a>' + opendataportal, {
          maxHeight: windowHeight
        }).on('popupopen', function() {
          $('#infobox').html(showCity(city, data, count));
        });
        console.log("Finished " + city.Stadtname);
        marker.addTo(map);
        //Update the page
        $('.totals').html("Dieser Prototyp des Open Data Monitors umfasst zu Demonstrationszwecken zur Zeit <strong>" + cityCount + " Städte</strong> mit insgesamt <strong>" + completeCount + " Datensätzen</strong> (ohne Anspruch auf Vollständigkeit)");
        //Is this the last city?
        if (cityCount == quickCityCount) {
          console.log("cityCount reached quickCityCount, finding unique formats");
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
