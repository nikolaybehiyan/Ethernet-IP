
var opcUAServer = require('./model/opcUAServer');
var AdamEIP = require('./model/adam');


var conn = new AdamEIP;
var opcServer = new opcUAServer();
var working = 0;
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

//forever start -o out.log -e err.log --spinSleepTime 5000 -c node app.js
//forever stopall
//forever stop app.js


