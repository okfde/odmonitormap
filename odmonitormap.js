// $(function(){
  var cityURL = 'data/index.csv';

  var map;

  var nameSlugMap = {
    'Frankfurt am Main': 'frankfurt',
    'Stuttgart': 'stuttgart'
  };

  var $el = $('#map');
  var windowHeight = $(window).height();
  $el.height(windowHeight);

  map = L.map('map').setView([51.358061573190916, 10.810546875], 6);
  L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  var loadCity = function(cityslug, callback) {
    d3.csv('data/' + cityslug + '.csv', callback);
  };

  var showCity = function(city, data) {
    var count = 0;
    _.each(data, function(d){
      if (d.Format) {
        count += 1;
      }
    });
    var html = [];
    html.push('<h2>' + city.Stadtname + '</h2>')
    html.push('<p>Datensätze gesamt: ' + count + '</p>')
    return html.join('');
  };

  var getCityContent = function(city, marker) {
    var cityslug = nameSlugMap[city.Stadtname];
    loadCity(cityslug, function(data){
      console.log(data);
      marker.bindPopup(showCity(city, data), {
        maxHeight: windowHeight,
        autoPan: false
      });
    })
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