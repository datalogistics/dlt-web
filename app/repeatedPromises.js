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
var q = require('q');
var _ = require('underscore');
// Creating a promise queue - Only have n promises running at time
function prom(k) {
  return q.delay(1000).then(function() {
    if (k %10 == 0) {      
      //throw new Error("dsa");
      return q.reject("ddd");
    }
    return k;
  });
}

// Run it serially - i.e wait for each
function recProm(i) {
  console.log(i);
  if (i < 1000) {
    prom(i).then(recProm.bind(this,i+1));
  }       
}
//recProm(0);


// Now run n items at a time
function getPromiseQueue(num) {
  var count = 0;
  var n = num || 10;
  var promQue = [];
  var funcQue = [];
  var successCb;
  function recPromN() {
    // if ( i < 1000) {
    var ret = q();
    if (funcQue.length > 0) {
      var cur = funcQue.shift()(); // prom(i);
      count++;
      promQue.push(cur);
      // Remove already fulfilled items so that the count is correct
      promQue = promQue.filter(function(x) {        
        if (x.isFulfilled() || x.isRejected()) {
          count--;
          return false;
        }
        return true;
      });      
      if (count < n) {
        ret = recPromN();
      } else {
        // Wait for the item from Que        
        ret = q.race(promQue).then(recPromN);// .catch(function() {
        //   console.log("Er111");
        //   recPromN();
        // });
      }
      
      cur.then(function(x) {
        if (successCb)
          successCb.apply(successCb,arguments);
        // console.log(x);
      });
      
    } else {
      isRunning = false;
    }
    return ret;
  }
  var isRunning = false;
  var shouldRun = false;
  var self = {
    addToQueue : function (func) {
      funcQue.push(func);      
      if (shouldRun && !isRunning) {
        this.run();
      }
      return func;
    },    
    run : function (succCb,errCb) {
      shouldRun = true;
      isRunning = true;
      successCb = succCb;
      return q.try(recPromN).then(succCb).catch(function(err) {
        errCb.apply(errCb,arguments);
        //console.log("Erro" , err);
        self.run(succCb,errCb);
        return q.reject(err);
      });
    },
    getPromiseQueue : function() {
      if (promQue.length)
        return promQue;      
    },
    setN : function (num) {
      n = num;
    },
    getN : function () {
      return n;
    }
  };
  return self;
};

module.exports = {
  getPromiseQueue : getPromiseQueue
};

// TEST Code to check this out
// var pr = getPromiseQueue(10);
// for ( i = 0; i < 1000 ; i++) {
//   pr.addToQueue(prom.bind(prom,i));
// };
// pr.run(function(v) {
//   console.log("A ",v);
// },function (err) {
//   console.log("R ",err);
// });












