function mapController($scope, $routeParams, $http, UnisService) {
  var link_map = {
    "ucd-ucla"  : {
      "type": "al2s",
      "capacity": 300000,
      "endpoint_a": "128.120.83.7",
      "endpoint_z": "164.67.126.3"
    },
    "ucla-mizz" : {
      "type": "al2s",
      "capacity": 300000,
      "endpoint_a": "164.67.126.3",
      "endpoint_z": "128.206.119.41"
    },
    "ucla-utah" : {
      "type": "ion",
      "capacity": 300000,
      "endpoint_a": "164.67.126.3",
      "endpoint_z": "155.99.144.102"
    },
    "tamu-mizz" : {
      "type": "al2s",
      "capacity": 200000,
      "endpoint_a": "128.194.6.134",
      "endpoint_z": "128.206.119.41"
    },
    "mizz-nyser" : {
      "type": "al2s",
      "capacity": 300000,
      "endpoint_a": "128.206.119.41",
      "endpoint_z": "199.109.64.53"
    },
    "nyser-max" : {
      "type": "al2s",
      "capacity": 100000,
      "endpoint_a": "128.206.119.41",
      "endpoint_z": "206.196.180.223"
    },
    "nyser-bbn" : {
      "type": "ion",
      "capacity": 100000,
      "endpoint_a": "128.206.119.41",
      "endpoint_z": "192.1.242.158"
    },
    "renci-bbn" : {
      "type": "ion",
      "capacity": 100000,
      "endpoint_a": "152.54.14.26",
      "endpoint_z": "192.1.242.158"
    }
  };

  var map = baseMap("#downloadMap", 960, 500);

  $scope.services = UnisService.services;
  $http.get('/api/natmap')
    .then(function(res) {
      var natmap = res.data;

      allServiceData($scope.services, "ibp_server", natmap,
        mapPoints(map.projection, map.svg, "depots"));

      if (typeof $routeParams.id != 'undefined') {
        console.log($routeParams.id);
        highlightMapLocations(map.svg, ".depotLocation", function(d) {
          return this.getAttribute("depot_id") == $routeParams.id
        });
      }

      //Cleanup the tooltip object when you navigate away
      $scope.$on("$destroy", function() {
        d3.selectAll("#map-tool-tip").each(function() {this.remove()})
      });
    })
  .then(function() {
    var svg = map.svg.insert("g", "#overlay").attr("name", "network")
    for (key in link_map) {
      var link = link_map[key]
      add_link(svg, map.projection, link)
    }
  })
} // end controller


function add_link(svg, projection, link) {
  screen_location(svg, projection, link.endpoint_a,
      function(a) {
        screen_location(svg, projection, link.endpoint_z,
          function(z) {
          svg.append("path")
             .attr("d", link_arc(a, z))
             .attr("stroke-width", (link.capacity/100000)+.5)
             .attr("fill", "none")
             .attr("stroke", link_color(link.type))
             .attr("class", "geni_link")
          })
      })
}

function link_color(type) {
  if (type == "ion") {
    return "#102D46"
  } else if (type == "al2s") {
    return "#5A788E"
  } else {
    return "#6E5D5C" 
  }
}

//from: http://bl.ocks.org/mbostock/1153292
function link_arc(source, target) {
  var dx = target[0] - source[0],
      dy = target[1] - source[1],
      dr = Math.sqrt(dx * dx + dy * dy);
  return "M" + source[0] + "," + source[1] + "A" + dr + "," + dr + " 0 0,1 " + target[0] + "," + target[1];
}

function screen_location(svg, projection, endpoint, then) {
  var mapNode = svg.selectAll(".depotLocation").filter(function(d) {return this.getAttribute("name") == endpoint})
  if (mapNode.empty()) {
    var url = "https://freegeoip.net/json/" + endpoint
      d3.json(url, function (error, raw) {
        if (error) {
          console.log("could not locate ", endpoint)
        } else {
          var place = [raw.longitude.toFixed(2), raw.latitude.toFixed(2)]
          then(projection(place))
        }
      })
  } else {
    var mapGroup = d3.select(mapNode.node().parentNode)
    then(d3.transform(mapGroup.attr("transform")).translate)
  }
}
