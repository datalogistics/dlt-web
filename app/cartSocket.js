var cfg = require('../properties')
, q = require('q')
, xmlparse = require('xml2js').parseString
, request = require('request')
, exnodeApi = require('./exnodeApi')
, bdaApi = require('./bdaApp')
, querystring = require('querystring')
, usgsapi = require("./usgsapi")
,_ = require('underscore');

var bunyan = require('bunyan');
var log = bunyan.createLogger({
  name: "dlt-web-cart",
  streams : [
    {
      path: "./logs/bun.log"
    }]
});

var cartClient = {
  onDeleteOrder : function(client) {
    return function(d) {
      var usgsKey = d.key;
      var username, password;
      var orderId = d.orderId;
      var isEncrypted = false;
      var tokenStr;
      var sep = "@@";
      if (d.isToken) {
	var pair = d.token.split(sep);
	username = pair[0];
	password = pair[1];
	tokenStr = d.token;
      } else {
	var encrypt = new bdaApi.Encryption();
	username = encrypt.encrypt(d.username);
	password = encrypt.encrypt(d.password);
	tokenStr = username + sep + password;
      }
      isEncrypted = true;
      bdaApi.deleteOrderGroup(username, password, isEncrypted, orderId)
	.then(function(r) {
          // Log the getting orders
          // cartLog("Hello");
          var loguname = username;
          if (isEncrypted) {
            var encrypt = new bdaApi.Encryption();
            loguname = encrypt.decrypt(username);
          }
          log.info({ username : loguname ,actionType : "deleteOrders" , orderId : orderId }, "Removing all orders for given username and orderId");
          client.emit('cart_delete',{
            "token" : tokenStr,
            "res" : r,
            "orderId" : orderId
          });
	});
    };
  },
  getShoppingCart : function(client) {
    var nameToSceneId = exnodeApi.nameToSceneId;
    return function(d) {
      var usgsKey = d.key;
      var username, password;
      var isEncrypted = false;
      var tokenStr;
      var sep = "@@";
      if (d.isToken) {
	var pair = d.token.split(sep);
	username = pair[0];
	password = pair[1];
	tokenStr = d.token;
      } else {
	var encrypt = new bdaApi.Encryption();
	username = encrypt.encrypt(d.username);
	password = encrypt.encrypt(d.password);
	tokenStr = username + sep + password;
      }
      isEncrypted = true;
      bdaApi.getAllOrders(username, password, isEncrypted)
	.then(function(r) {
          // Log the getting orders
          // cartLog("Hello");
          var loguname = username;
          if (isEncrypted) {
            var encrypt = new bdaApi.Encryption();
            loguname = encrypt.decrypt(username);
          }
          log.info({ username : loguname , actionType : "getOrders" }, "Got all orders for given username");
          
          var EntityIdMap = {};
          var items = r.map(function(x) {
            EntityIdMap[x.entityId] = x;
            return x.entityId;
          });
          // var items = r.data.orderItemBasket || [];
          // items.push.apply(items,r.data.bulkDownloadItemBasket);
          client.emit("cart_nodata", {
            data: [],
            size: items.length,
            token: tokenStr
          });
          // The API can use any credentials - Hard coding
          var uname = cfg.usgs_api_credentials.username,
              pwd = cfg.usgs_api_credentials.password;
          return usgsapi.login(uname, pwd)
            .then(function(r) {
              var usgsKey = r.data;
              usgsapi.getMetaData(usgsKey, "LANDSAT_8", items)
		.then(function(res) {
                  // Lets group results by orderId
                  var orderIdToDataMap = {};
                  res.data.forEach(function(x) {
                    var orderId = EntityIdMap[x.entityId].orderId;
                    if (!orderIdToDataMap[orderId])
                      orderIdToDataMap[orderId] = [];
                    var arr = orderIdToDataMap[orderId];
                    arr.push(x);
                  });                
                  client.emit('cart_data_res', {
                    data: orderIdToDataMap,//res.data,
                    token: tokenStr
                  });
                  exnodeApi.getExnodeDataIfPresent(items, function(arr) {
                    client.emit("cart_nodata", {
                      data: arr,
                      size: items.length,
                      token: tokenStr
                    });
                    // console.log("Not present " , arr);
                  }, function(obj) {
                    var retMap = {};
                    obj.map(function(x) {
                      var arr = retMap[nameToSceneId(x.name)] = retMap[nameToSceneId(x.name)] || [];
                      arr.push(x);
                    });
                    client.emit("cart_data", {
                      data: retMap,
                      size: items.length,
                      token: tokenStr
                    });
                    // console.log("Present " , arr);
                  });
		});
            });
	})
	.catch(function(x) {
	  console.log("Cart Socket error ",x);
          if (x instanceof Error)
            client.emit("cart_error", {
              error: x
            });
          else
            client.emit("cart_error", {
              errorMsg: true,
              error: x
            });
	});
    };
  }
};

module.exports = cartClient; 
