Dropzone.autoDiscover = false;

INIT_LON = 52.51663871100423;
INIT_LAT = 13.412246704101564;
INIT_ZOOM = 4;
HEAT_RADIUS = 5;
HEAT_BLUR = 10;

state = function(message) {
  $('#status').text(message);
};

var map = L.map('map', {
  center: [INIT_LON, INIT_LAT],
  zoom: INIT_ZOOM,
  zoomControl: false,
  attributionControl: true,
  dragging: true
});
heat = L.heatLayer([], {radius: HEAT_RADIUS, blur: HEAT_BLUR}).addTo(map);

// map.on('click', function(ev) {
//   $('#location').text(ev.latlng.lat + ", " + ev.latlng.lng)
// });

addOSMTileLayer = function() {
  // add OSM tile layers
  var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  var osmAttrib='Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors';
  new L.TileLayer(osmUrl, {minZoom: 8, maxZoom: 19, attribution: osmAttrib}).addTo(map);
};

addMapBoxTileLayer = function() {
  accessToken = 'pk.eyJ1IjoiZHNpdyIsImEiOiJjaXB2bmt0M2wwMDVxaHdrc3AwM2N4OHk0In0.kHVayjzVrUycpA2prqRhOg';
  attribution = '© <a href="https://www.mapbox.com/feedback/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>';
  url = 'https://api.mapbox.com/v4/mapbox.light/{z}/{x}/{y}.png';
  new L.TileLayer(url+'?access_token=' + accessToken, {
      attribution: attribution
  }).addTo(map);
};

processFile = function(file) {
  var latlngs = [];
  var ob = new oboe();

  ob.node('locations.*', function(location) {
    var SCALAR_E7 = 0.0000001;
    latlngs.push([location.latitudeE7 * SCALAR_E7, location.longitudeE7 * SCALAR_E7]);
    return oboe.drop;
  }).done(function() {
    state('Generating map...');
    heat._latlngs = latlngs;
    heat.redraw();

    $(".modal").modal("close");
    state("0%");
    $(".progress .determinate").width('0%');
    Materialize.toast(latlngs.length.toLocaleString() + " locations added", 4000);
  });

  parseJSONFile(file, ob);
};

parseJSONFile = function parseJSONFile(file, ob) {
  chunkReaderBlock = function(_offset, length, _file) {
    var r = new FileReader();
    var blob = _file.slice(_offset, length + _offset);
    r.onload = readEventHandler;
    r.readAsText(blob);
  }

  var fileSize = file.size;
  var prettyFileSize = prettySize(fileSize);
  var chunkSize = 512 * 1024; // bytes
  var offset = 0;
  var readEventHandler = function (evt) {
    if (evt.target.error == null) {
      offset += evt.target.result.length;
      var chunk = evt.target.result;
      var percentLoaded = (100 * offset / fileSize).toFixed(0);
      state(percentLoaded + '% of ' + prettyFileSize + ' loaded...');
      $(".progress .determinate").width(percentLoaded+'%');
      ob.emit('data', chunk); // callback for handling read chunk
    } else {
      return;
    }
    if (offset >= fileSize) {
      ob.emit('done');
      return;
    }

    // parse next chunk
    chunkReaderBlock(offset, chunkSize, file);
  }

  // start parsing first chunk
  chunkReaderBlock(offset, chunkSize, file);
};

/* https://github.com/davglass/prettysize */
(function(){var sizes=["Bytes","kB","MB","GB","TB","PB","EB"];window.prettySize=function(e,s,i){var t,n;return sizes.forEach(function(n,o){i&&(n=n.slice(0,1));var r,B=Math.pow(1024,o);B>e||(r=(e/B).toFixed(1)+"",r.indexOf(".0")===r.length-2&&(r=r.slice(0,-2)),t=r+(s?"":" ")+n)}),t||(n=i?sizes[0].slice(0,1):sizes[0],t="0"+(s?"":" ")+n),t};}());


$(function () {
  // addOSMTileLayer()
  addMapBoxTileLayer();

  // init default config
  $('.modal').modal({
    dismissible: false
  });

  setTimeout(function() {
    $(".modal").modal('open');
  }, 500);

  dropzone = new Dropzone("#dropzone", {
    url: '/',
    previewsContainer: document.createElement('div'), // >> /dev/null
    acceptedFiles: ".json",
    uploadMultiple: false,
    clickable: true,
    accept: function (file, done) {
      processFile(file);
    }
  });
});
