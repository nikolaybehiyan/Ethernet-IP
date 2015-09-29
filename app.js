
//MAIN FILE

//import dependencies
var opcUAServer = require('./model/opcUAServer');
var AdamEIP = require('./model/adam');


var conn = new AdamEIP; //define new adamIP object
var opcServer = new opcUAServer(); //define new opcServer instance
var working = 0;

//WorkFLOW: -> send request to adam to get session --> wait for session id--> check the session -->
// --> make request packet --> send requestpacket --> wait for reply from Adam --> when got reply extract UDP ip address -->
// -->open udp channel --> connect to it and wait for reply --> 500 packages received? --> close udp packet --> resendReadpacket -->cyclus...
//  initiateConnection function will send callback after sending requestpacket

conn.initiateConnection({port: 44818, host: '192.168.202.200'}, connected);
function connected(err) {
  if (typeof(err) !== "undefined") {
    // We have an error.  Maybe the PLC is not reachable.
    process.exit();
  }

  if(working == 0){
    console.log('CONNECTED');
    opcServer.getDIList();
    opcServer.setAdamParams(conn.getDi());

    setTimeout(function(){
      opcServer.initializeServer();
      conn.eventRead.on('newData', function(){
        opcServer.setAdamParams(conn.getDi());
        working++;
      })
    },2000)

  }
}


//1: This is how to start node js server to work forever. all console.log methods will end up in out.log file. all errors will be written to err.log file /
// when error occurs the node js server closes and restarts after spinsleeptime. in this case after 5 seconds

// 1 . forever start -o out.log -e err.log --spinSleepTime 5000 -c node app.js
// 2 . forever stopall   // to stop all processes
// 3 . forever stop app.js // to stop only one process


