var format_raw = function() {
  return function(d) {
    return d;
  }
}

var format_GB = function() {
  return function(d){
    return (d/1e9).toFixed(2); // GB
  }
}

var format_rate = function() {
  return function(d){
    return (d/1).toFixed(3);
  }
}

var format_rate_mb = function() {
  return function(d) {
    return (d/1e6).toFixed(2);
  }
}

var format_percent = function() {
  return function(d) {return (d*100).toFixed(2)}
}

var format_timestamp = function() {
  return function(d){
    var ts = d/1e3;
    return d3.time.format('%X')(new Date(ts));
  }
}

var ETS = {
  'used': "ps:tools:blipp:ibp_server:resource:usage:used",
  'free': "ps:tools:blipp:ibp_server:resource:usage:free",
  'user': "ps:tools:blipp:linux:cpu:utilization:user",
  'sys' : "ps:tools:blipp:linux:cpu:utilization:system",
  'in'  : "ps:tools:blipp:linux:network:utilization:bytes:in",
  'out' : "ps:tools:blipp:linux:network:utilization:bytes:out",
  'rtt' : "ps:tools:blipp:linux:net:ping:rtt",
  'ttl' : "ps:tools:blipp:linux:net:ping:ttl",
  'bandwidth': "ps:tools:blipp:linux:net:iperf:bandwidth"
};

var ETS_CHART_CONFIG = {}
ETS_CHART_CONFIG[ETS.used] = {selector: "#CHART-Time-GB",
			      xformat: format_timestamp, yformat: format_GB};
ETS_CHART_CONFIG[ETS.free] = {selector: "#CHART-Time-GB",
			      xformat: format_timestamp, yformat: format_GB};
ETS_CHART_CONFIG[ETS.user] = {selector: "#CHART-Time-Percent",
			      xformat: format_timestamp, yformat: format_percent};
ETS_CHART_CONFIG[ETS.sys]  = {selector: "#CHART-Time-Percent",
			      xformat: format_timestamp, yformat: format_percent};
ETS_CHART_CONFIG[ETS.in]   = {selector: "#CHART-Time-Rate",
			      xformat: format_timestamp, yformat: format_rate};
ETS_CHART_CONFIG[ETS.out]  = {selector: "#CHART-Time-Rate",
			      xformat: format_timestamp, yformat: format_rate};
ETS_CHART_CONFIG[ETS.rtt]  = {selector: "#CHART-Time-Rate",
			      xformat: format_timestamp, yformat: format_raw};
ETS_CHART_CONFIG[ETS.ttl]  = {selector: "#CHART-Time-Rate",
			      xformat: format_timestamp, yformat: format_raw};
ETS_CHART_CONFIG[ETS.bandwidth]  = {selector: "#CHART-Time-Rate",
				    xformat: format_timestamp, yformat: format_rate_mb};


var getETSChartConfig = function(key) {
  return ETS_CHART_CONFIG[key];
};
