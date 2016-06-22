// =============================================================================
//  Data Logistics Toolkit (dlt-web)
//
//  Copyright (c) 2015-2016, Trustees of Indiana University,
//  All rights reserved.
//
//  This software may be modified and distributed under the terms of the BSD
//  license.  See the COPYING file for details.
//
//  This software was created at the Indiana University Center for Research in
//  Extreme Scale Technologies (CREST).
// =============================================================================
angular.module('pubsub', [])
// Uses the rootScope to broadcast and deliver tagged messages
  .factory('CommChannel', ['$rootScope', function ($rootScope) {
    // broadcast the notifications
    var newData = function (tag, item) {
      $rootScope.$broadcast(tag, {item: item});
    };
    // subscribe to notifications
    var onNewData = function(tag, handler) {
      $rootScope.$on(tag, function(event, args) {
        handler(args.item);
      });
    };
    // return the publicly accessible methods
    return {
      newData: newData,
      onNewData: onNewData
    };
  }])
