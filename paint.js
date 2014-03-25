"use strict";

/*global d3, OpenDataMap*/

if (!OpenDataMap) {
    var OpenDataMap = {};
}

OpenDataMap.paint = function(container, projection, dataSource) {
    var path = d3.geo.path()
	    .projection(projection);
    
    var clickHandlers = [];
    
    var module = {
	/*
	 Pass in a function to be called every time a geometry path on the map is clicked.
	 */
	addClickHandler : function(clickHandler) {
	    clickHandlers.push(clickHandler);
	},
	panAndZoom : function(boundingbox) {
	    var x1 = boundingbox[0],
		y1 = boundingbox[1],
		x2 = boundingbox[2],
		y2 = boundingbox[3];

	    var boxSize = Math.max(
		Math.abs(x1 - x2),
	        Math.abs(y1 - y2));

	    var zoomFudge = 200000;

	    module.redrawAll();
	},
	redrawAll : function() {
	    var l = container.selectAll("g")
		    .data(dataSource);

	    l.enter().append("g")
		.classed("leaflet-zoom-hide", true)
		.attr("id", function(l) {
		    return l.name();
		});
	    
	    l.exit().remove();

	    l.each(function(parentDatum){
		var p = d3.select(this).selectAll("path")
			.data(function(l) {
			    return l.geometry();
			});

		p.enter().append("path")
		    .on("click", function(event, index) {
			clickHandlers.forEach(function(h){
			    h(event, index);
			});
		    })
		    .datum(function(d, i){
			d.layer = parentDatum.name();
			return d;
		    })
		    .attr("id", function(d, i){
			return d.properties.Name;
		    });		
		p.exit().remove();
		p.attr("d", path);
	    });
	}
    };
    
    return module;
};


