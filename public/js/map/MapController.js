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
    var svg = map.svg.insert("g", "#overlay")
                   .attr("name", "network")
                   .attr("pointer-events", "none")

    for (key in link_map) {
      var link = link_map[key]
      add_link(svg, map.projection, link.endpoint_a, link.endpoint_z, link.type)
    }
  })
} // end controller


function add_link(svg, projection, endpoint_a, endpoint_b, label) {
  console.log("endpoints: ", endpoint_a, endpoint_b)

  screen_location(svg, projection, endpoint_a,
      function(a) {
        screen_location(svg, projection, endpoint_b,
          function(b) {
          svg.append("path")
             .attr("d", linkArc(a, b))
             .attr("stroke-width", 2)
             .attr("fill", "none")
             .attr("stroke", "#6E5D5C")
             .attr("class", "geni_link")
          })
      })
}

//from: http://bl.ocks.org/mbostock/1153292
function linkArc(source, target) {
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
