var cp = require("child_process");
var fs = require("fs");
var q = require('q');
var path = require('path');
var _ = require('underscore');
// var  "--attribute --issuer periscope_ID.pem --key periscope_private.pem --role read --subject-cert prakash_ID.pem --out Prakash_periscope_read.der"
// var  creddy --generate --cn "prakash"
var spawn = require('child_process').spawn;
var getVersionCmd = function(host,port) {  
  var arr = [host,port];
  return spawn('get_version', arr);
};

// An array of regexps and C-style scan strings to parse the output - CHANGE THIS ARRAY WHEN output from get_version changes 
var cmdOutput_ParseArr = [
  { testReg: /^ibp_server(no FIFO):/i,
    sstr: 'ibp_server(no FIFO): %s',
    info : "ibp_server_version"},
  { testReg: /^CMake Build Date:/i,
    sstr: 'CMake Build Date: %S',
    info: 'build_date'},
  { testReg: /^Compiler:/i,
    sstr: 'Compiler: gcc (Debian 4.7.2-5) 4.7.2' },
  { testReg: /^Compile Flags(Debug):  /i,
    sstr: 'Compile Flags' },
  { testReg: /^Build Host:/i,
    sstr: 'Build Host: ezra-zen' },
  { testReg: /^Build OS:/i,
    sstr: 'Build OS: Linux-3.12-1-amd64-x86_64' },
  { testReg: /^Interfaces(4): /i,
    sstr: 'Interfaces(4):' },
  { testReg: /^Depot start time:/i,
    sstr: 'Depot start time: %S',
    info: 'depot_start_time'},
  { testReg: /^Uptime(d:h:m:s): /i,
    sstr: 'Uptime(d:h:m:s): %S',
    info : 'uptime'},
  { testReg: /^Total Commands:/i,
    sstr: 'Total Commands: %d  Connections: %d',
    info: ['totalCommands','connections']},
  { testReg: /^Active Threads/i,
    sstr: 'Active Threads: %d',
    info : 'activeThreads'},
  { testReg: /^Reject stats --- Current:/i,
    sstr: 'Reject stats --- Current: %d  Total: %d',
    info: ['rejectCurrent','rejectTotal']},
  { testReg: /^Pending RID count/i,
    sstr: 'Pending RID count: %d',
    info : 'pendingRid'},
  { testReg: /^Depot Transfer Stats --  Read:/i,
    sstr: 'Depot Transfer Stats --  Read: %d b (%s %s) Write: %d b (%s %s) Total: %d b (%s %s)',
    info : ['depotTransfer_Read','depotTransfer_ReadH','__','depotTransfer_Write','depotTransfer_WriteH','__','depotTransfer_Total','depotTransfer_TotalH','__']},
  { testReg: /^Depot-Depot copies:/i,
    sstr: 'Depot-Depot copies: %d b (%s)',
    info: ['depotDepotCopies','depotDepotCopiesH']},
  { testReg: /^RID:/i,
    sstr: 'RID: %d Max: %d b (%s %s) Used: %d b (%s %s) Diff: %d b (%s %s) Free: %d b (%s %s) Allocations: %d (%s %s) Corrupt count: %d Activity count: %d',
    info: ['ridNum','ridMax','ridMaxH','__','ridUsed','ridUsedH','__','ridDiff','ridDiffH','__','ridFree','ridFreeH','__','ridAlloc','ridAllocH','__','ridCorrupt','ridActivityCount']},
  { testReg: /^Trash stats for RID:/i,
    sstr: 'Trash stats for RID: %d -- Deleted: %d b (%s %s) in %d files  -- Expired: %d b (%s %s) in %d files',
    info: ['trashRidNum', 'trashDeleted','trashDeletedH','__','trashFiles','ridExpired','ridExpiredH','__','ridExpiredFiles']},
  { testReg: /^Total resources/i,
    sstr: 'Total resources: %d  Max: %d b (%s %s) Used: %d b (%s %s) Diff: %d b (%s %s) Free: %d b (%s %s) Allocations: %d (%d alias)  Corrupt count: %d',
    info: ['totalResources','totalMax','totalMaxH','__','totalUsed','totalUsedH','__','totalDiff','totalDiffH',"__",'totalFree','totalFreeH',"__",'totalAllocations','__','totalCorruptCount']},
  { testReg: /^Total Trash stat/i,
    sstr: 'Total Trash stats -- Deleted: %d b (%s %s) in %d files  -- Expired: %d b (%s %s) in %d files',
    info: ['totalTrashDeleted','totalTrashDeletedH','__','totalTrashFiles','totalTrashExpired','totalTrashExpiredH','__','totalTrashExpiredFiles']},
];
var sscanf = require('scanf').sscanf;
function parseOutput2(data) {
  var lines = data.split(/\n/g);
  var obj = {};
  lines.forEach(function(x) {
    var arr;
    var k = cmdOutput_ParseArr;
    for (var i =0;i < k.length;i++) {
      var it = k[i];    
      if (it.testReg.test(x)) {
	arr = [x,it.sstr];
	if (!it.info) {
	  // Ignore
	  break;
	} else if (_.isArray(it.info)) {
	  arr.push.apply(arr,it.info);			 
	} else {
	  arr.push(it.info);
	}
	var out = sscanf.apply(sscanf,arr);
	// console.log("Out " , out , " for Arr " , arr);
	_.extend(obj,sscanf.apply(sscanf,arr));
	break;
      }
    }
  });
  return obj;
};
// First Attempt
function parseOutput(data) {
  var lines = data.split(/\n/g);
  var obj = {};  
  //obj.lines = lines;
  var regArr= [/^Depot Transfer Stats/i,
	       /^RID:/i,
	       /^Depot start time/i,
	       /^Total resources/i,
	       /^Depot start time/i,
               /^Uptime\(d:h:m:s\)/i,
	      ];
  var usefulLines = [];
  lines.forEach(function(x) {
    regArr.forEach(function(r,ind) {
      if (r.test(x)) {
	usefulLines[ind] = x;
      }
    });
  });
  usefulLines.forEach(function(v,ind) {
    switch(ind) {
    case 0:{
      var arr = v.match(/\(.*?\)/g);
      arr = arr.map(function(x) {
	return x.substr(1).slice(0,-1);
      });
      obj.depotTransferStats = {
	read : arr[0],write : arr[1], total : arr[2]
      };
    }break;
    case 1: {
      var arr = v.match(/\(.*?\)/g);
      arr = arr.map(function(x) {
	return x.substr(1).slice(0,-1);
      });
      obj.rid = {
	max : arr[0] , used : arr[1],diff : arr[2] , free : arr[3]
      };      
    }break;
    case 2: {
      var moment = require('moment');
      var val = v.match(/:.*/g)[0].substr(2);
      var date = moment(val,"ddd MMM D hh:mm:ss yyy");
      obj.depotStart = date;
    }break;
    };
  });
  obj.lines = lines;
  obj.usefulLines = usefulLines;
  return obj;
}
function getVersion(host,prt) {
  var prom = q.defer();
  var port = Number(prt);
  if (Number.isNaN(port))
    prom.reject(Error("Invalid port"));
  var s = getVersionCmd(host,port);
  var data = "";
  var errorStr = "";
  s.stdout.on('data',function(dt) {
    data += dt;
  });
  s.stderr.on('data',function(data) {
    errorStr+=data;
  });
  s.on('close',function(code) {
    // console.log('
    if (code == 0)
      prom.resolve(parseOutput2(data));
    else
      prom.reject(Error("Unable to generate - Exited with error "+errorStr));
  });
  return prom.promise;
}

module.exports = {
  getVersion : getVersion
};
/** GENERATED JSON :
 { build_date: 'Tue Jan 13 15:34:20 UTC 2015',
     depot_start_time: 'Thu Sep 24 23:32:59 201',
     totalCommands: 926,
     connections: 1795,
     activeThreads: 1,
     rejectCurrent: 0,
     rejectTotal: 0,
     pendingRid: 0,
     depotTransfer_Read: 0,
     depotTransfer_ReadH: '0.00',
     __: 'GB',
     depotTransfer_Write: 0,
     depotTransfer_WriteH: '0.00',
     depotTransfer_Total: 0,
     depotTransfer_TotalH: '0.00',
     depotDepotCopies: 0,
     depotDepotCopiesH: '0.00',
     ridNum: 1,
     ridMax: 31526486016,
     ridMaxH: '29.36',
     ridUsed: 0,
     ridUsedH: '0.00',
     ridDiff: 31526486016,
     ridDiffH: '29.36',
     ridFree: 29646319616,
     ridFreeH: '27.61',
     ridAlloc: 0,
     ridAllocH: '0',
     ridCorrupt: 0,
     ridActivityCount: 4193,
     trashRidNum: 1,
     trashDeleted: 0,
     trashDeletedH: '0.00',
     trashFiles: 0,
     ridExpired: 0,
     ridExpiredH: '0.00',
     ridExpiredFiles: 0,
     totalResources: 1,
     totalMax: 31526486016,
     totalMaxH: '29.36',
     totalUsed: 0,
     totalUsedH: '0.00',
     totalDiff: 31526486016,
     totalDiffH: '29.36',
     totalFree: 29646319616,
     totalFreeH: '27.61',
     totalAllocations: 0,
     totalCorruptCount: 0,
     totalTrashDeleted: 0,
     totalTrashDeletedH: '0.00',
     totalTrashFiles: 0,
     totalTrashExpired: 0,
     totalTrashExpiredH: '0.00',
     totalTrashExpiredFiles: 0 }
 */
getVersion('128.206.119.19',6714).then(function() {
  console.log(arguments);
}).catch(function() {
  console.log(arguments);
});
