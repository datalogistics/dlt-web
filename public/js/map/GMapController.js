function gMapController($scope, $location, $http, SocketService, UnisService, uiGmapGoogleMapApi) {

  $scope.services = UnisService.services
  $scope.markers = [];
  $scope.checked = false;
  $scope.services = UnisService.services;
  console.log("Unis services: ", $scope.services);


  $scope.toggleSlider = function(){
    $scope.checked = !$scope.checked;
  };

  angular.extend($scope, {
        events : {
          markers : {
            mouseover : function(marker, eventname, model) {
              console.log(marker, eventname, model);
            }
          }
        },

        searchbox : {
            template: 'searchbox.template.html',
            parentdiv: 'mapParent',
            position:'top-left',
            options: {
              visible: true
            },
            events:{
                  places_changed: function (searchBox) {
                    places = searchBox.getPlaces();
                    if(places == 0){
                      return;
                    }

                    console.log("Places: ", places);
                    var bounds = new google.maps.LatLngBounds();
                    bounds.extend(places[0].geometry.location);
                    coords = {latitude: places[0].geometry.location.lat(),
                              longitude: places[0].geometry.location.lng()};

                    $scope.gmap.center = coords;

                    depth = places[0].adr_address.split(',').length;
                    if(depth == 3){
                      $scope.gmap.zoom = 12;
                    } else if(depth >3){
                      $scope.gmap.zoom = 15;
                    } else if (depth == 2){
                      $scope.gmap.zoom = 7;
                    } else {
                      $scope.gmap.zoom = 4;
                    }
                    console.log(depth);

                  }
                }
        },

        gmap : { center: { latitude: 40.267193, longitude: -86.134903 },
         zoom: 4,
         events: {
           tilesloaded: function (map) {
             $scope.$apply(function () {
                //console.log('this is the map instance', map);
              });
            }
          },
          styles: [
           {elementType: 'geometry', stylers: [{color: '#242f3e'}]},
           {elementType: 'labels.text.stroke', stylers: [{color: '#242f3e'}]},
           {elementType: 'labels.text.fill', stylers: [{color: '#746855'}]},
           {
             featureType: 'administrative.locality',
             elementType: 'labels.text.fill',
             stylers: [{color: '#d59563'}]
           },
           {
             featureType: 'poi',
             elementType: 'labels.text.fill',
             stylers: [{color: '#d59563'}]
           },
           {
             featureType: 'poi.park',
             elementType: 'geometry',
             stylers: [{color: '#263c3f'}]
           },
           {
             featureType: 'poi.park',
             elementType: 'labels.text.fill',
             stylers: [{color: '#67b279'}]
           },
           {
             featureType: 'road',
             elementType: 'geometry',
             stylers: [{color: '#38414e'}]
           },
           {
             featureType: 'road',
             elementType: 'geometry.stroke',
             stylers: [{color: '#212a37'}]
           },
           {
             featureType: 'road',
             elementType: 'labels.text.fill',
             stylers: [{color: '#9ca5b3'}]
           },
           {
             featureType: 'road.highway',
             elementType: 'geometry',
             stylers: [{color: '#746855'}]
           },
           {
             featureType: 'road.highway',
             elementType: 'geometry.stroke',
             stylers: [{color: '#1f2835'}]
           },
           {
             featureType: 'landscape.natural.terrain',
             elementType: 'geometry.fill',
             stylers: [{color: '#4f8f00', weight: 10}]
           },
           {
             featureType: 'road.highway',
             elementType: 'labels.text.fill',
             stylers: [{color: '#f3d19c'}]
           },
           {
             featureType: 'transit',
             elementType: 'geometry',
             stylers: [{color: '#2f3948'}]
           },
           {
             featureType: 'transit.station',
             elementType: 'labels.text.fill',
             stylers: [{color: '#d59563'}]
           },
           {
             featureType: 'water',
             elementType: 'geometry',
             stylers: [{color: '#17263c'}]
           },
           {
             featureType: 'water',
             elementType: 'labels.text.fill',
             stylers: [{color: '#515c6d'}]
           },
           {
             featureType: 'water',
             elementType: 'labels.text.stroke',
             stylers: [{color: '#17263c'}]
           },
           {
            featureType: "poi.business",
            stylers: [
              {
                visibility: "off"
              }
            ]
          }
         ]

        }
      });

      uiGmapGoogleMapApi.then(function(maps){
        console.log(maps);
      })


  $http.get('/api/natmap')
    .then(function(res) {
      var natmap = res.data;
      $scope.serviceDetails = allServiceData($scope.services, null, natmap,
        console.log("depots"));
      $scope.natmaps = natmap;
      console.log($scope.natmaps);
      console.log("service deets", $scope.serviceDetails);

      plot_services($scope.serviceDetails);
      return natmap;
    });

    var db_img = '/images/dbmarker.png'
    var ferry_img = '/images/burn.png'

    var plot_services = function(data){

        data.forEach(function(entry, index){
          console.log(entry);
          var depot = find_service_by_id(entry.depot_id)[0];

          first_seen = depot.firstSeen;
          fseen_date = new Date(first_seen);

          var marker = {
              position: {latitude: entry.location.latitude, longitude:entry.location.longitude},
              title: entry.name,
              depot_id: entry.depot_id,
              id: index,
              options: {
                icon: ferry_img,
                labelContent: entry.name,
                labelAnchor: "50 0",
                labelClass: "marker-labels",
              },
              open_ps: function(){        // hnngg, way to access parent scope vars inside a directive.
                $scope.checked = true;
              },
              service : depot,
              meta : {
                fseen_mon : fseen_date.getUTCMonth(),
                fseen_year : fseen_date.getUTCFullYear(),
                fseen_day : fseen_date.getUTCDate(),
                fseen_hour : fseen_date.getUTCHours(),
                fseen_minute : fseen_date.getUTCMinutes(),
                fseen_sec : fseen_date.getUTCSeconds(),
                first_seen_time : (' ' + fseen_date.getUTCDate() + ' ' + fseen_date.getUTCMonth() + ' ' + fseen_date.getUTCFullYear() + ' ' + fseen_date.getUTCHours() + ':' +
                    fseen_date.getUTCMinutes() + ':' + fseen_date.getUTCSeconds() ),
                first_seen_string: (new Date(first_seen).toUTCString())
              },
              open: false,
              window_option: {
                visible: false
              }
          };
          console.log((new Date(first_seen).toUTCString()));
          console.log("Marker: ", marker);
          $scope.markers.push(marker);
        });

    };

    uiGmapGoogleMapApi.then(function(maps) {
      maps.visualRefresh = true;
    });

    var find_service_by_id = function(id){
      var result = $scope.services.filter(function( obj ) {
        return obj.id == id;
      });
      console.log("Got Service", result);
      return result;
    };

    $scope.zoom_service = function(marker){
      $scope.gmap.center = {latitude: marker.position.latitude, longitude: marker.position.longitude};
      $scope.gmap.zoom   = 15;
      console.log("Clicked zoon");
    };

    $scope.collapse_all = function(){
      $scope.markers.forEach(function(m){
          m.open = false;
      });
    };

    $scope.onClick = function(marker) {
        marker.window_options.visible = marker.window_options.visible;
    };

    $scope.closeClick = function(marker) {
        marker.open = false;
    };

    $scope.open_depot_in_dash = function(marker){
      console.log(marker, "depot in dash");
      console.log("opening");

      angular.extend($scope, {
        checked : true
      });

      marker.open = true;
    };

    jQuery('.closeall').click(function(){
      jQuery('.panel-collapse.in')
        .collapse('hide');
    });


    $scope.lines = [];
    SocketService.on('service_data', function(data){

      if (typeof data =='string') {
        data = JSON.parse(data);
      }
      console.log("NEW SOCKET EVENT", data);


      $http.get(data.selfRef).then(function(res){
        console.log("RESPONSE: ", res.data);
      });

      m = $scope.markers.find(m => (m.service.id == data.id));

      $http.get(m.service.runningOn.href).then(function(res){
        console.log("Res data: ", res.data);
        console.log("POSITION: ", res.data.location);
        console.log("Num: ", m.id);
        new_coords = res.data.location;

        line = {
          id : m.id,
          path : [$scope.markers.find(m => (m.service.id == data.id)).position, new_coords]
        }

        $scope.markers.find(m => (m.service.id == data.id)).service.location = new_coords;
        $scope.markers.find(m => (m.service.id == data.id)).position = new_coords;
        //$scope.markers.find(m => (m.service.id == data.id)).position.latitude = new_coords.latitude;
        //$scope.markers.find(m => (m.service.id == data.id)).position.latitude = new_coords.longitude;
        console.log("Markers: ", $scope.markers);

        if($scope.lines.length > 0){
          $scope.lines = $scope.lines.filter(l => (l.id != m.id));
          $scope.lines.push(line);
        } else {
          $scope.lines.push(line);
        }
        console.log($scope.lines);
        //$scope.$apply();

        uiGmapGoogleMapApi.then(function(maps) {
          maps.visualRefresh = true;
        });
      });

    });

}
