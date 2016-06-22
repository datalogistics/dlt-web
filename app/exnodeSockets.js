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
var cfg = require('../properties')
, q = require('q')
, xmlparse = require('xml2js').parseString
, request = require('request')
, exnodeApi = require('./exnodeApi')
, querystring = require('querystring')
,_ = require('underscore');

var clientHandler = {  
  onUSGSLatSearch : function(client) {
    return function(data) {
      var params = data;
      var paramString = querystring.stringify(params);
      // Make a request to the USGS get_metadata url which returns the data in xml form
      var url = cfg.usgs_lat_searchurl + "?"+paramString;
      console.log(url);
      request(url,function(err,r,resp){
	xmlparse(resp, function(err , result){
          console.dir(result);      
          var data = result || {};
          data = data.searchResponse || [];      
          var r = (data.metaData || []).map(function(x) {
            for (var i in x) {
              if(_.isArray(x[i]) && x[i].length == 1){
		x[i] = x[i][0];
              }
            };
            x.name = x.sceneID;
            return x;
          });
          if (data.length == 0){
            try{
              r.error = result.html.body ;
            } catch(e){
              r.error ="No results found";
            }
          };
          /*********** Emitting some data here **********/
          client.emit('usgs_lat_res',r);

          // // Use the data to query mongo where name maps to id
          // // Super hacky and super slow -- temporary way
          // r.map(function(x){
          // });        
	});
      });
    };
  },
  onUSGSRowSearch : function(client) {
    return function(data) {
      var params = data;
      var paramString = querystring.stringify(params);
      // Make a request to the USGS get_metadata url which returns the data in xml form
      var url = cfg.usgs_row_searchurl + "?"+paramString;
      console.log(url);
      request(url,function(err,r,resp){
	if (err) {
          client.emit('usgs_row_res',{error : err});
          return;
	}
	xmlparse(resp, function(err , result){
          var data = result || {};
          data = data.searchResponse || [];      
          var r = (data.metaData || []).map(function(x) {
            for (var i in x) {
              if(_.isArray(x[i]) && x[i].length == 1){
		x[i] = x[i][0];
              }
            };
            x.name = x.sceneID;
            return x;
          });
          if (data.length == 0){
            try{
              r.error = result.html.body ;
            } catch(e){
              r.error ="No results found";
            }
          };
          /*********** Emitting some data here **********/
          client.emit('usgs_row_res',r);

          // // Use the data to query mongo where name maps to id
          // // Super hacky and super slow -- temporary way
          // r.map(function(x){
          
          // });        
	});
	// Now use this response to 
      });        
    };
  },
  getAllChildExnodeFiles : function (client) {
    return function(id , emitId) {
      var defer = q.defer();    
      if (id == null) {
	// This can never occur in an array since the parent can never be a part of a child
	id = 'null=';
      } else if (_.isArray(id)){   
	id = id.join(",");
      };    
      
      http.get({
	host : cfg.serviceMap.dev.url,
	port : cfg.serviceMap.dev.port,
	path : '/exnodes?fields=id,parent,selfRef,mode,name&parent='+ id
      }, function(http_res) {
	var data = '';
	http_res.on('data', function (chunk) {
          data += chunk;
	});
	http_res.on('end',function() {
          var obj = JSON.parse(data);
          // console.log( obj );
          var recArr = [];
          var fileArr = [];
          for (var i=0 ; i < obj.length ; i++) {
            var it = obj[i];
            if (it.mode == 'file') {
              // console.log("emitting " , it); 
              fileArr.push(it);
            } else {
              recArr.push(it.id);            //console.log("Proceeding with Id ",it.id);
            }
          };
          // console.log("FIles " , fileArr);
          client.emit('exnode_childFiles',{ arr : fileArr , emitId : emitId});
          defer.resolve(recArr);
          //getAllChildExnodeFiles(recArr, emitId);
	});
	http_res.on('error',function(e) {
          console.log("Error for Id ",id);
          defer.resolve([]);
	});
      });
      return defer.promise;   
    };
  },
  onExnodeRequest : function(client) {
    var nameToSceneId = exnodeApi.nameToSceneId;
    return function(data){
      var arr = data.sceneId;
      if (!_.isArray(arr))
	arr = [data.sceneId];
      exnodeApi.getExnodeDataIfPresent(arr, function(data) {
	client.emit('exnode_nodata', { data : data});
      },function(obj){
	var retMap  = {};
	obj.map(function(x) {
          var arr = retMap[nameToSceneId(x.name)] = retMap[nameToSceneId(x.name)] || [];
          arr.push(x);
	});
	client.emit('exnode_data', {data : retMap});
      });
    };
  },
  getAllChildExFilesDriver : function(client) {
    var getAllChildExnodeFiles = clientHandler.getAllChildExnodeFiles(client); 
    return function getAllChildExFilesDriver(arr , emitId , cb) {
      if (!arr || !arr.length) {
	// Done
	cb();
	return ;
      } else if(arr) {
	if (arr.length > 5) {
          // console.log(arr);
          var tmp = arr.splice(0,4);
          getAllChildExFilesDriver(tmp, emitId , function(narr){
            arr.push.apply(arr,narr);
            getAllChildExFilesDriver(arr,emitId,cb);
          });        
	} else {
          var promise = getAllChildExnodeFiles(arr, emitId);
          // console.log(promise);
          // Just execute cb
          if (promise && promise.then)
            promise.then(function(arr){
              getAllChildExFilesDriver(arr,emitId,cb);
            });
	}      
      }
    };
  }  
};

module.exports = clientHandler;
