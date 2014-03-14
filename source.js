"use strict";

/*global d3, OpenDataMap*/

if (!OpenDataMap) {
    var OpenDataMap = {};
}

/*
 A source is a table of data.
 It has a list of names.
 It has a list of properties.
 It provides a data table for those names and properties.
 The data in the table are OpenDataMap.timeLookup values.
 */
OpenDataMap.source = function() {
    return {
	properties : function() {
	  throw "Not implemented";
	},
	names : function() {
	    throw "Not implemented";
	},
	data : function(properties, names, time) {
	    throw "Not implemented";
	},
	name : function() {
	    throw "Not implemented";
	},
	onChange : function(callback) {
	    throw "Not Implemented";
	}
    };
}();

OpenDataMap.source.immutable = function(myProps, myNames, myData, name) {
    return {
	prototype : OpenDataMap.source,
	properties : function() {
	    return myProps;
	},
	names : function() {
	    return myNames;
	},
	data : function(properties, names, time) {
	    return properties.map(function(p){
		var i = myProps.indexOf(p);

		if (i < 0) {
		    throw "Unknown property " + p;
		}
		
		return names.map(function(n){
		    var j = myNames.indexOf(n);

		    if (j < 0) {
			throw "Unknown name " + n;
		    }

		    return myData[i][j].lookup(time);
		});
	    });
	},
	name : function() {
	    return name;
	},
	onChange : function() {
	    // no-op
	}
    };
};

OpenDataMap.source.empty = function() {
    return OpenDataMap.source.immutable([], [], [], "empty");
};

/*
 Shapes is a deserialized geoJSON representation of some feature.
 We will use the non-geometric properties to populate our source.
 */
OpenDataMap.source.fromGeometry = function(shapes, name) {
    var headers = ["Name"];
    var headerSet = d3.set(headers);

    var names = [];

    var shapeProperties = shapes.map(function(s){
	return d3.map(s.properties);
    });

    shapeProperties.forEach(function(s){
	s.keys().forEach(function(k){
	    if (!headerSet.has(k)) {
		headerSet.add(k);
		headers.push(k);
	    }
	});

	if (!s.has("Name")) {
	    throw "Imported shape did not have a Name property " + s;
	}

	names.push(s.get("Name"));
    });

    var data = headers.map(function(h){
	return shapeProperties.map(function(s){
	    var datum = s.has(h) ? s.get(h) : "";
	    return OpenDataMap.timeLookup.constant(datum);
	});
    });
    
    return OpenDataMap.source.immutable(headers, names, data, name);
};

/*
 Creates a source which is a single-property that changes over time.
 prop is the name of the property.
 rows is a list of maps, where each map contains a name of an object and years to values, e.g. [{"Name" : "my-geometry-object", 2013 : 1, 2014 : 2}]
*/
OpenDataMap.source.fromTimeSeries = function(prop, rows, name) {
    var names = [];
    var data = [];
    
    rows.forEach(function(r){
	var row = d3.map(r);
	
	if (!row.has("Name")) {
	    throw "Row was missing name for property " + prop;
	}

	names.push(row.get("Name"));
	row.remove("Name");
	data.push(OpenDataMap.timeLookup.series(row));
    });

    return OpenDataMap.source.immutable([prop], names, [data], name);
};

/*
 Creates a source which combines a number of other sources.
 These sources must not overlap: for a given property and a given name, there must only be one source which provides a value.

 TODO: support for mutable sources.
 */
OpenDataMap.source.combined = function(sources, name) {
    var propertiesCache = null;
    var namesCache = null;

    var lookupSource = function(sourceName) {
	return sources.filter(function(s){
	    return s.name() === sourceName;
	})[0];
    };

    var ensureCache = function(){
	var addSource = function(cache, items, source) {
	    items.forEach(function(i){
		if (!cache.has(i)) {
		    cache.set(i, []);
		}
		cache.get(i).push(source.name());
	    });
	};
	
	if (!propertiesCache) {
	    propertiesCache = d3.map({});
	    namesCache = d3.map({});

	    sources.forEach(function(s){
		addSource(propertiesCache, s.properties(), s);
		addSource(namesCache, s.names(), s);
	    });
	}
    };
    
    return {
	prototype: OpenDataMap.source,
	names : function() {
	    var result = [];
	    sources.forEach(function(s){
		result = result.concat(s.names());
	    });
	    return result;
	},
	properties : function() {
	    var result = [];
	    sources.forEach(function(s){
		result = result.concat(s.properties());
	    });
	    return result;
	},
	data : function(properties, names, time) {
	    ensureCache();
	    
	    return properties.map(function(p){
		if (!propertiesCache.has(p)) {
		    throw "Unknown property " + p;
		}

		var propertySources = propertiesCache.get(p);

		return names.map(function(n){
		    if (!namesCache.has(n)) {
			throw "Unknown name " + n;
		    }

		    var acceptable = namesCache.get(n).filter(function(s){
			return propertySources.indexOf(s) >= 0;
		    });

		    var len = acceptable.length;
		    if (len == 0) {
			return "";
		    } else if (len == 1) {
			var source = lookupSource(acceptable[0]);
			return source.data([p], [n], time)[0][0];
		    } else {
			throw "Combined source " + name + " found too many sources supplying property " + p + " for name + " + n + ": " + acceptable;
		    }
		});
	    });
	},
	sources : function() {
	    return sources;
	},
	name : function() {
	    return name;
	}
    };
};