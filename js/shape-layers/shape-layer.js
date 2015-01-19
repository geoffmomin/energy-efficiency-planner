"use strict";

/*global module, require*/


var d3 = require("d3"),
    idMaker = require("../id-maker.js"),
    helpers = require("../helpers.js"),
    callbacks = helpers.callbackHandler,
    fixGeometryIdsFactory = require("./fix-geometry-ids.js"),
    worksheetFactory = require("./worksheet.js")(),
    resultsTableFactory = require("./results-table.js"),
    legendFactory = require("../legend-data.js");

/*
 Create a new shape layer.

 The geometry of the layer is represented as a deserialized GeoJSON object (see: http://geojson.org/geojson-spec.html).
 */
module.exports = function(errors) {
    var fixGeometryIds = fixGeometryIdsFactory(errors);

    return function(namePreference, geometry, boundingbox) {
	var name = idMaker.fromString(namePreference),
	    opacity = 1.0,
	    onSetOpacity = callbacks(),
	    anyPoints;

	fixGeometryIds(geometry);

	var l = {
	    name: function() {
		return name;
	    },

 	    boundingbox: function() {
		return boundingbox;
	    },

	    geometry: function() {
		return geometry;
	    },
	    
	    /*
	     Does this layer container any Points. This is useful, because it means we can know whether we should present the user with the option to scale these based on data.
	     */
	    anyPoints: function() {
		if (anyPoints === undefined) {
		    var checkGeom = function(o) {
			if (o.type) {
			    switch(o.type) {
			    case "Point":
			    case "MultiPoint":
				anyPoints = true;
				break;
			    default:
				// noop
			    }
			}

			if (o.length) {
			    o.forEach(function(x) {
				checkGeom(x);
			    });
			}

			if (o.features) {
			    checkGeom(o.features);
			}

			if (o.geometries) {
			    checkGeom(o.geometries);
			}

			if (o.geometry) {
			    checkGeom(o.geometry);
			}
		    };

		    checkGeom(geometry);
		}

		return anyPoints;
	    },

	    getOpacity: function() {
		return opacity;
	    },
	    
	    setOpacity: function(o) {
		opacity = o;
		onSetOpacity(o);
	    },
	    
	    legend: function() {
		var labels = l.worksheet.sortPropertyBins(10);
		
		return legendFactory(
		    labels,
		    labels.map(l.worksheet.colourFun())
		);		    
	    },

	    worksheet: worksheetFactory(geometry),
	    resultsTable: resultsTableFactory(),

	    onSetOpacity: onSetOpacity.add
	};

	geometry.forEach(function(g){
	    g.layer = l;
	    g.key = name + "/" + g.id;
	});

	return l;
    };
};