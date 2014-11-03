define(["require","exports","module","detect-os","stamen-super-classy","gmap-custom-tile-layer"], function(require,exports, module) {

  'use strict';

  var StamenSuperClassy   = require("stamen-super-classy"),
      GmapCustomTileLayer = require("gmap-custom-tile-layer"),
      DetectOs            = require('detect-os');

  var detectOs = new DetectOs();

  var state             = {},
      data              = {};

  module.exports=function(rootSelector, options, callback) {

    var that = this;

    StamenSuperClassy.apply(that, arguments);

    var rootNode   = that.get(rootSelector)[0],
        bigMapNode = that.get('.big-park-map',rootNode)[0],
        smallMapNode = that.get('.small-park-map',rootNode)[0];

    //
    // Converts GeoJSON bounding box to Google Maps bounds
    // Lifted from http://stackoverflow.com/questions/23488463/zoom-to-markers-using-geojson-googlemaps-api-v3
    //
    function geoJSONBBoxToGoogleBounds(GeoJSONBBoxPolygon) {
      var bounds = new google.maps.LatLngBounds(),
          data   = GeoJSONBBoxPolygon,
          a, b, point;

      for (var ii = 0; ii < GeoJSONBBoxPolygon.coordinates[0].length; ii++) {
        a = GeoJSONBBoxPolygon.coordinates[0][ii][1];
        b = GeoJSONBBoxPolygon.coordinates[0][ii][0];

        point = new google.maps.LatLng(a, b);
        bounds.extend(point);
      }

      return bounds;
    }

    //
    // Open directions in the right place for each platform
    // defaults to web if not sure
    //
    function launchDirections() {
      if (detectOs.getMobileOperatingSystem() === 'iOS') {
        location.href='comgooglemaps://?q='+encodeURIComponent(options.name)+'&center='+options.centroid.coordinates[1]+', '+options.centroid.coordinates[0]+'&zoom=15&views=transit';
      } else {
        location.href='https://www.google.com/maps/dir//\''+options.centroid.coordinates[1]+', '+options.centroid.coordinates[0]+'\'';
      }

    }

    //
    // Initialization methods
    //

    function initStamenLayer() {
      return that.parksLayer = new GmapCustomTileLayer({
        tilePath : 'http://{s}.map.parks.stamen.com/{z}/{x}/{y}.png',
        size     : 256
      });
    }

    function initBigMap() {

      that.bigMap = new google.maps.Map(bigMapNode,{
        mapTypeControl: false,
        streetViewControl: false,
        center: new google.maps.LatLng(options.centroid.coordinates[1], options.centroid.coordinates[0]),
        zoom                : 15,
        scrollwheel         : false,
        disableDefaultUI    : true,
        mapTypeControlOptions : {
          mapTypeIds : ['parksLayer']
        }
      });

      that.bigMap.fitBounds(geoJSONBBoxToGoogleBounds(options.bbox));

      that.bigMap.mapTypes.set('parksLayer', that.parksLayer);
      that.bigMap.setMapTypeId('parksLayer');
    }

    function initSmallMap() {
      that.smallMap = new google.maps.Map(smallMapNode,{
        mapTypeControl: false,
        streetViewControl: false,
        center: new google.maps.LatLng(options.centroid.coordinates[1], options.centroid.coordinates[0]),
        zoom                : 6,
        scrollwheel         : false,
        disableDefaultUI    : true,
        mapTypeControlOptions : {
          mapTypeIds : ['parksLayer']
        }
      });

      that.smallMapRect = new google.maps.Rectangle({
        strokeColor: '#000',
        strokeOpacity: 0.35,
        strokeWeight: 1,
        fillColor: '#000',
        fillOpacity: 0.1,
        map: that.smallMap,
        bounds: geoJSONBBoxToGoogleBounds(options.bbox)
      });

      that.smallMapCircle = new google.maps.Marker({
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillOpacity: 1.0,
            fillColor: "black",
            strokeOpacity: 1.0,
            strokeColor: "white",
            strokeWeight: 2.0,
            scale: 4.0
        },
        position: new google.maps.LatLng(options.centroid.coordinates[1], options.centroid.coordinates[0])
      });
      that.smallMapCircle.setMap(that.smallMap);
    }

    function initActions() {
      var directionsAction = that.get('.directions-action', rootNode)[0];

      directionsAction.addEventListener('click', function() {
        return launchDirections();
      }, false);
    }

    //
    // Init function
    //
    function initialize() {
      initStamenLayer();
      initBigMap();
      initSmallMap();
      initActions()

      that.on('ready', function() {
        callback(null, that);
      });
    }

    //
    // GO GO GO!
    //
    google.maps.event.addDomListener(window, 'load', function() {
      initialize();
    });

    return that;

  };

});
