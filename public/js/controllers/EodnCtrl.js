/*
 * Eodn Page Controller
 * public/js/controllers/
 * EodnCtrl.js
 */

function movingLineFromPointToPoint(st , end) {
	return d3.selectAll('svg').append('line')
		.style({stroke:'rgb(255,0,0)', strokeWidth:2})
		.attr('x1',st.x).attr('y1',st.y)
		.attr('x2',st.x).attr('y2',st.y)
		.transition().duration(1000)
		.attr('x2',end.x).attr('y2',end.y)
		;
};
var DownloadMap = (function(){
	// All config 
	var width = 960,height = 500 , selector = '#downloadMap';
	var progressStart = 0 , nodeLocationMap = {};
	var knownLocations = {
			'bloomington' : [-86.526386,39.165325] 
	}
	// The main variables
	var svg , projection , g , path , zoom;
	function clicked(d) {
		  var centroid = path.centroid(d),
		      translate = projection.translate();

		  projection.translate([
		    translate[0] - centroid[0] + width / 2,
		    translate[1] - centroid[1] + height / 2
		  ]);

		  zoom.translate(projection.translate());

		  g.selectAll("path").transition()
		      .duration(700)
		      .attr("d", path);
	}

	function zoomed() {
	  projection.translate(d3.event.translate).scale(d3.event.scale);
	  g.selectAll("path").attr("d", path);
	}	
	// The main obj
	var d = {
				init : function(hideInfo){
					progressStart = 0;
					projection = d3.geo.albersUsa()
					    .scale(1070)
					    .translate([width / 2, height / 2]);
	
					path = d3.geo.path()
					    .projection(projection);
	
					/*
					zoom = d3.behavior.zoom()
					    .translate(projection.translate())
					    .scale(projection.scale())
					    .scaleExtent([height, 8 * height])
					    //.on("zoom", zoomed);*/
	
					svg = d3.select(selector).append("svg")
					    .attr("width", width)
					    .attr("height", height);
	
					g = svg.append("g");
					//.call(zoom);
	
					g.append("rect")
					    .attr("class", "background")
					    .attr("width", width)
					    .attr("height", height);
	
					d3.json("/maps/us.json", function(error, us) {
					  g.append("g")
					      .attr("id", "states")
					    .selectAll("path")
					      .data(topojson.feature(us, us.objects.states).features)
					    .enter().append("path")
					      .attr("d", path)
					      //.on("click", clicked);
	
					  g.append("path")
					      .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
					      .attr("id", "state-borders")
					      .attr("d", path);
					  var loc = d.addKnownLocation('bloomington');
					  if(!hideInfo){
						  d.initProgessBox();
					  }
					});
				}, 
				initTip : function(){
					// Add tooltips 
					tip = d3.tip().attr('class', 'd3-tip').html(function() {
						var x = d3.select(this);
						return x.attr('name');						
					});
					svg.call(tip);
					var timer ;
					svg.selectAll('circle.eodnNode')					  					
					  .on('mouseover', function(){
						  clearTimeout(timer);
						  tip.show.apply(this,arguments);
					  })
					  .on('mouseout', function(){
						 timer = setTimeout(tip.hide,2000);
					  });
				},
				initNodes : function(map){					
					for(var i in map ){
						var arr = map[i];
						if(arr)
							d._addLocation(''+i, arr);
					}
					d.initTip();
				},
				initProgessBox : function(){
					svg.append("rect")
				    .attr("class", "background")
				    .attr("width", 30)
				    .attr("height", 300)
				    .style('fill','gray')
				    .attr('x', width - 50)
				    .attr('y', '200')
				    ;
				},	
				_doProgress : function(loc,progress){					
					d._moveLineToProgress(loc.attr('location').split(","),loc.attr('color') , progress);					
				},
				doProgress : function(ip , progress){
					var loc =  nodeLocationMap[ip];
					d._moveLineToProgress(loc.attr('location').split(","),loc.attr('color') , progress);
				},
				doProgressWithOffset : function(ip , progress , offset){
					var loc =  nodeLocationMap[ip];
					d._moveLineToProgressWithOffset(loc.attr('location').split(","),loc.attr('color') , progress);
				},
				addKnownLocation : function(name){
					var loc = knownLocations[name];
					if(loc)
						return d._addLocation(name,loc);
					else 
						throw "NoSuchLocation";
				},
				_addLocation : function(name, latLongPair) {		
					var color = d.getRandomColor();					
					var node = svg.append("circle")
						.attr("r",5)
						.attr('fill',color)
						.attr('color',color)
						.attr('class',name + " eodnNode")
						.attr('name',name)
						.attr('location',latLongPair)
						.attr("transform", function() {return "translate(" + projection(latLongPair) + ")";});
					nodeLocationMap[name] = node ;
					return  node ;
				},				
				removeLocation : function(name){
					svg.select('circle'+'#'+name).remove();
				},			
				_moveLineToProgress : function(loc,color , progress , offsetPercent){
					progressStart = progressStart || 0 ; 
					if (progressStart >= 100)
						return;
					if(progressStart + progress >= 100){
						progress = 100 - progressStart ;
					}
					d._moveLineToProgressWithOffset(loc,color,progress,progressStart)
				},
				_moveLineToProgressWithOffset : function(loc,color , progress , offsetPercent){
					if (progressStart >= 100)
						return;
					var ratio = 300 / 100 ;
					var progOffset = 200 + (offsetPercent || 0) * ratio ;
					// draw bar 
					var prog = [width - 50 , progOffset];
					var h = ratio * progress , w = 30 ; 				
					d._move(projection(loc), prog , color)
					.each("end", function(){						
						svg.append('rect')
						.attr("fill", color)
						.attr("width", w)
				    	.attr("height", h)
				    	.attr('x', width - 50)
				    	.attr('y', progOffset);
						progressStart += progress ;
					}).transition().duration(500).remove();
				},
				getRandomColor : function(){
					var r = function(){return Math.floor(Math.random() * 255);};
					return 'rgb('+r()+','+r()+','+r()+')';
				},
				_move : function (st , end , color ) {
					var y2 = end[1];
					return d3.selectAll('svg').append('line')
						.style({stroke: color , strokeWidth:2})
						.attr('x1',st[0]).attr('y1',st[1])
						.attr('x2',st[0]).attr('y2',st[1])
						.transition().duration(500)
						.attr('x2',end[0]).attr('y2',y2)
						//.transition().duration(500).remove()
						;					
				}
	};
	return d;
})();
angular.module('EodnCtrl', []).controller('EodnController', function($scope,$routeParams,$rootScope, $http,Socket , Depot) {
	var id = $routeParams.id ;
	var depotId = $routeParams.depotId ;
	$rootScope.gotoSomeotherPage = true ;
	if(!id) {
		// If no id given then remove the progress bar and just show the map
		$scope.hideFileInfo = true ;
	}
	
	if(depotId){
		// Do something else
		$scope.hideFileInfo = true ;
	}
	DownloadMap.init($scope.hideFileInfo);
	Socket.emit("eodnDownload_request",{ id : id});
	console.log("fine till here " ,id);
	 var getAccessIp = function(x){
		  return ((x.accessPoint || "").split("://")[1] || "").split(":")[0] || ""; 
	    };
	function addLocationsFromDepot(s){
		// Create a map 
		var map = {};
		for (var i = 0 ; i < s.length ; i++){
			var d = s[i];
			if(d && d.location) {
				map[getAccessIp(d)] = [d.location.longitude,d.location.latitude];
			}
		}
		DownloadMap.initNodes(map);		
	}
	if($rootScope.services){
		addLocationsFromDepot($rootScope.services);
	} else {
		$rootScope.getServices(function(services) {
			addLocationsFromDepot(services);
		});
	}
	Socket.on("eodnDownload_Nodes",function(data){
		console.log("Socket data ",data.data);
		// Use this data to create nodes 
		DownloadMap.initNodes(data.data);		
	});
	k = $scope ;
	Socket.on("eodnDownload_Info", function(data){
		// Set this data in scope to display file info
		console.log('file data ' , data);
		if(data.isError){
			$scope.error = true;
		} else {
			$scope.error = false;
			$scope.name = data.name ,
			$scope.size = data.size , 
			$scope.connections = data.connections;			
		}
	});
	Socket.on("eodnDownload_Progress",function(data){
		console.log('progress data', data);
		var s = $scope.size || 1 ;
		console.log("totalSize" , s);
		var d = data ;
		var ip = d.ip;
		var pr = d.progress;
		var sizeOfChunk = d.amountRead || pr;
		var progress = (pr / s ) * 100 ;
		var offset = (d.offset/ s )  * 100;
		DownloadMap.doProgressWithOffset(ip,sizeOfChunk, offset);
	});
}); // end controller

