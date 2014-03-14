"use strict";

/*global d3, OpenDataMap */

if (!OpenDataMap) {
    var OpenDataMap = {};
}

OpenDataMap.timeLookup = function() {
    return {
	lookup : function(time) {
	    throw "Not implemented";
	}
    };
}();

/*
 Expects a map of years to values, e.g. {2013 : 1, 2014: 1.1, 2015: 1.2}
*/
OpenDataMap.timeLookup.series = function(timeMap) {
    var asYears = function(s) {
	var year = parseInt(s);
	if (isNaN(year)) {
	    throw "Not a date " + s;
	} else {
	    return year;
	};
    };
    
    var dates = timeMap.keys().map(asYears).sort();
    
    var module = {
	prototype: OpenDataMap.timeLookup,
	
	lookup : function(time) {
	    var i = d3.bisectLeft(dates, time);
	    if (i >= dates.length) {
		i = dates.length - 1;
	    }
	    return timeMap.get(dates[i]);
	}
    };
    
    return module;
};

OpenDataMap.timeLookup.constant = function(datum) {
    return {
	prototype: OpenDataMap.timeLookup,
	lookup : function(time) {
	    return datum;
	}
    };
};