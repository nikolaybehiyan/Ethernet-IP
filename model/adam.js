var net = require('net');
var events = require('events');
var dgram = require('dgram');

function AdamEIP(){
    var self = this;
    self.connectReq   = new Buffer([0x65,0x00,0x04,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x0a,0x0b,0x0c,0x0d,0x0e,0x0f,0x0a,0x0b,0x00,0x00,0x00,0x00,0x01,0x00,0x00,0x00]);
    self.EIP_CIP_Header = new Buffer([0x6f,0x00,0x27,0x00,0x00,0x03,0x02,0x00,0x00,0x00,  // third is length
        0x00,0x00,0x00,0x00,0x00,0x01,0x00,0x28,0x1e,0x4d,
        0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x14,0x00,
        0x02,0x00,0x00,0x00,0x00,0x00,0xb2,0x00,0x17,0x00]);//, // second last is length
    self.Routing_Header = new Buffer([0x54, // CIP Connection manager service = forward Open
        0x02,0x20,0x06,0x24,0x01, // 0x02 = 2 words in path, 0x2006 = logical segment, class 6 = connection manager, 0x2401 = logical segment, instance 1
        0x0a,0x09]); // Priority/ticks multiplier, 0x0a = normal priority, 0x09 = about 10 second timeout given 0x0a priority

    self.Connection_Path = new Buffer([0x20,0x04,0x24,0x67, 0x2c,0x65,0x2c,0x66]);
    // This is the PCCC command.
    self.PCCC_Encapsulation_Header = new Buffer([0x02,0x00, // 02 = 2 words in the path.
        0x00,0x00,0xf0,0xf0,0xf0,0xf0,0x02,0x00,
        0x01,0x00,0x64,0x00,0x00,0x00,0x02,
        0x00,0x00,0x00,
        0x20, 0x4e, 0x00,0x00, 0x04,0x48,
        0x20, 0x4e, 0x00,0x00,0x04, 0x28,0x01,
        0x04]);
    self.readReq = new Buffer(1500);
    self.readPacketArray = [];
    self.connectTimeout = undefined;
    self.isoclient = undefined;
    self.isoConnectionState = 0;
    self.globalTimeout = 4500;
    self.sessionHandle = 0;
    self.resetTimeout = undefined;
    self.connectCBIssued = false;

    self.udpCLient = undefined;
    self.resend = undefined;
    self.packetNotReceived = undefined;
    self.retryTime = 2000;
    self.closeUDPNotFired = undefined;

    self.diArr = {
        di0: 0,
        di1: 0,
        di2: 0,
        di3: 0,
        di4: 0,
        di5: 0,
        di6: 0,
        di7: 0,
        di8: 0,
        di9: 0,
        di10: 0,
        di11: 0,
        di12: 0,
        di13: 0,
        di14: 0,
        di15: 0
    }


}
AdamEIP.prototype.initiateConnection = function (cParam, callback) {
    var self = this;
    if (cParam === undefined) { cParam = {port: 44818, host: '192.168.202.200'}; }

    if (typeof(cParam.name) === 'undefined') {
        self.connectionID = cParam.host;
    } else {
        self.connectionID = cParam.name;
    }
    self.connectionParams = cParam;
    self.connectCallback = callback;
    self.connectCBIssued = false;
    self.connectNow(self.connectionParams);
};

AdamEIP.prototype.connectNow = function(cParam) {
    var self = this;
    if (self.isoConnectionState >= 1) { return; }
    self.connectionCleanup();
    self.isoclient = net.connect(cParam, function(){
        self.onTCPConnect.apply(self,arguments);
    });

    self.isoConnectionState = 1;  // 1 = trying to connect

    self.isoclient.on('error', function(){
        self.connectError.apply(self, arguments);
    });

    console.log('initiating a new connection',1,self.connectionID);
    console.log('Attempting to connect to host...',0,self.connectionID);
};

AdamEIP.prototype.onTCPConnect = function() {
    var self = this;
    // Track the connection state
     self.isoConnectionState = 2;  // 2 = TCP connected, wait for EIP connection confirmation

    // Send an EIP connection request.
    self.connectTimeout = setTimeout(function(){
        self.packetTimeout.apply(self,arguments);
    }, self.globalTimeout);

    self.isoclient.write(self.connectReq.slice(0,28));       //GET SESSION

    // Listen for a reply.
    self.isoclient.on('data',function() {                 //LISTEN FOR RESPONSE
        console.log('Received response on GET SESSION');
        self.onEIPConnectReply.apply(self, arguments);
    });

    // Hook up the event that fires on disconnect
    //self.isoclient.on('end',function() {
    //  console.log('END CALLED');
    //  self.endCalled = true;
    //  self.onClientDisconnect.apply(self, arguments);
    //});
};
AdamEIP.prototype.onEIPConnectReply = function(data) {
    var self = this;
    self.isoclient.removeAllListeners('data');
    self.isoclient.removeAllListeners('error');

    clearTimeout(self.connectTimeout);

    // Track the connection state
    self.isoConnectionState = 4;  // 4 = Good to go.  (No PDU with EIP so 3 is an invalid state)

    // First we check our error code in the EIP section.
    if (data[8] !== 0x00 || data[9] !== 0x00 || data[10] !== 0x00 || data[11] !== 0x00) {
        console.log('ERROR RECEIVED IN REGISTER SESSION RESPONSE PACKET - DISCONNECTING');
        console.log(data);
        console.log('Codes are ' + data[8] + " " + data[9] + " " + data[10] + " " + data[11]);
        self.connectionReset();
        return null;
    }

    // Do we check our context here?
    // Let's not bother.

    // Expected length is from packet sniffing - some applications may be different - not considered yet.
    if (data[0] !== 0x65 || data[2] !== 0x04 || data.length < 28) {
        console.log('INVALID PACKET or CONNECTION REFUSED - DISCONNECTING');
        console.log(data);
        console.log('RCV buffer length is ' + data.length + 'data[0] is ' + data[0] + ' and data[2] is ' + data[2]);
        self.connectionReset();
        return null;
    }

    console.log('EIP Register Session Response Received - connection confirmed',0,self.connectionID);

    self.sessionHandle = data.readInt32LE(4);  // Not BE

    console.log("Session Handle is " + decimalToHexString(self.sessionHandle),0,self.connectionID);

    self.isoclient.on('data', function() {
        self.onResponse.apply(self, arguments);
    });  // We need to make sure we don't add this event every time if we call it on data.
    self.isoclient.on('error', function() {
        self.readWriteError.apply(self, arguments);
    });  // Might want to remove the connecterror listener

    if ((!self.connectCBIssued) && (typeof(self.connectCallback) === "function")) {
        self.connectCBIssued = true;
        self.sendReadPacket();
        self.connectCallback();      ///TRIGGER FUNCTION READITEMS
        self.connectCBIssued = false;
    }

    return;
};

AdamEIP.prototype.eventRead = new events.EventEmitter();

AdamEIP.prototype.onResponse = function(data) {
    var self = this;

    console.log("onResponse called with length " + data.length);

    if (data.length < 24) { // not even long enough for EIP header
        console.log('DATA LESS THAN 24 BYTES RECEIVED.  TOTAL CONNECTION RESET.');
        console.log(data);
        self.connectionReset();
//		setTimeout(connectNow, 2000, connectionParams);
        return null;
    }

    // The smallest read packet will pass a length check of 25.  For a 1-item write response with no data, length will be 22.
    if (data.length > (data.readInt16LE(2) + 24)) {
        console.log("An oversize packet was detected.  Excess length is " + (data.length - data.readInt16LE(2) - 24) + ".  ");
        console.log("Usually because two packets were sent at nearly the same time by the PLC.");
        console.log("We slice the buffer and schedule the second half for later processing.");
//		setTimeout(onResponse, 0, data.slice(data.readInt16LE(2) + 24));  // This re-triggers this same function with the sliced-up buffer.
        process.nextTick(function(){
            self.onResponse(data.slice(data.readInt16LE(2) + 24))
        });  // This re-triggers this same function with the sliced-up buffer.
// was used as a test		setTimeout(process.exit, 2000);
    }

    if (data.readInt32LE(4) !== self.sessionHandle) { // not even long enough for EIP header
        console.log('INVALID SESSION HANDLE RECEIVED');
        console.log('Expected ' + decimalToHexString(self.sessionHandle) + ' received ' + decimalToHexString(data.readInt32LE(4)));
        console.log(data);
        self.connectionReset();
//		setTimeout(connectNow, 2000, connectionParams);
        return null;
    }

    if (data.readInt32LE(8) !== 0) { // not even long enough for EIP header
        console.log('EIP ERROR RECEIVED at zero-based offset 8/9/10/11');
        console.log(data);
        self.connectionReset();
//		setTimeout(connectNow, 2000, connectionParams);
        return null;
    }

    // First we check our error code.
    if (data[8] !== 0x00 || data[9] !== 0x00 || data[10] !== 0x00 || data[11] !== 0x00) {
        console.log('ERROR RECEIVED IN REGISTER SESSION RESPONSE PACKET - DISCONNECTING');
        console.log(data);
        console.log('Codes are ' + data[8] + " " + data[9] + " " + data[10] + " " + data[11]);
        self.connectionReset();
//		setTimeout(connectNow, 2000, connectionParams);
        return null;
    }

    // Do we check our context?  Let's not bother.

    // Expected length is from packet sniffing - some applications may be different
    if (data[0] !== 0x6f || data.readInt16LE(2) > (data.length - 24)) {
        console.log('INVALID PACKET or CONNECTION REFUSED - DISCONNECTING');
        console.log(data);
        console.log('RCV buffer length is ' + data.length + ' and data[0] is ' + data[0] + ' and DRI16LE2 is ' + data.readInt16LE(2));
        self.connectionReset();
//		setTimeout(connectNow, 2000, connectionParams);
        return null;
    }

    console.log('Valid EIP Data Response Received', 1);

    if (data.readInt32LE(24) !== 0 || data.readInt16LE(34) !== 0) {
        console.log('CIP ERROR RECEIVED at zero-based offset 8/9/10/11 or non-zero value at packet offset 34');
        console.log(data);
        self.connectionReset();
//		setTimeout(connectNow, 2000, connectionParams);
        return null;
    }



    var PCCCData = data.slice(98,102);  // added length spec

    //console.log('Received  bytes of PCCC-data from PLC.', t);
    console.log(PCCCData, 2);
    var udpAddr = PCCCData.toString('hex');

    var a = udpAddr.substring(0,2);
    var b =  udpAddr.substring(2,4);
    var c =  udpAddr.substring(4,6);
    var d =  udpAddr.substring(6,8);
    var a1 = parseInt(a, 16);
    var b1 = parseInt(b, 16);
    var c1 = parseInt(c, 16);
    var d1 = parseInt(d, 16);

    if(isNaN(a1)){
        console.log('Received invalid ip address');

        self.isoConnectionState = 0;
        setTimeout(function(){
            self.onClientDisconnect();
        },2000)

    }else{
        self.udpCLient = dgram.createSocket({type:'udp4', reuseAddr: true});
        self.udpCLient.bind(2222, function() {
            console.log(a1,b1,c1,d1);
            self.udpCLient.addMembership(a1 + '.' + b1 + '.' + c1 + '.' + d1);
            self.udpCLient.on('message', function(msg) {
                clearTimeout(self.packetNotReceived);
                self.packetNotReceived = setTimeout(function(){
                    console.log('PROBLEM');
                    self.connectionReset();
                    return;
                },3000);
                var bitMessage = msg.slice(msg.length - 2, msg.length).toString('hex');
                var counter = msg.readInt32LE(msg.length - 12);
                var bit1 = parseInt(bitMessage.substring(0,2),16).toString(2);
                var bit2 = parseInt(bitMessage.substring(2,4),16).toString(2);
                var bit1length = bit1.length;
                var bit2length = bit2.length;
                for(var k = 1; k <= 8-bit1length;k++){
                    bit1 = '0' + bit1;
                }
                for(var l = 1; l <= 8 - bit2length;l++){
                    bit2 = '0' + bit2;
                }

                //console.log(counter,bit1,bit2);
                self.diArr.di0 = bit1.substring(7,8);
                self.diArr.di1 = bit1.substring(6,7);
                self.diArr.di2 = bit1.substring(5,6);
                self.diArr.di3 = bit1.substring(4,5);
                self.diArr.di4 = bit1.substring(3,4);
                self.diArr.di5 = bit1.substring(2,3);
                self.diArr.di6 = bit1.substring(1,2);
                self.diArr.di7 = bit1.substring(0,1);
                self.diArr.di8 = bit2.substring(7,8);
                self.diArr.di9 = bit2.substring(6,7);
                self.diArr.di10 = bit2.substring(5,6);
                self.diArr.di11 = bit2.substring(4,5);
                self.diArr.di12 = bit2.substring(3,4);
                self.diArr.di13 = bit2.substring(2,3);
                self.diArr.di14 = bit2.substring(1,2);
                self.diArr.di15 = bit2.substring(0,1);

                self.eventRead.emit('newData');
                if (counter == 499 || counter == 500){
                    self.udpCLient.removeAllListeners('message');
                    self.udpCLient.removeAllListeners('error');


                    self.udpCLient.close();
                    self.udpCLient = undefined;
                    self.resend = setTimeout(function(){
                        self.resendReadPacket();
                    },1000);
                }
            });
            self.udpCLient.on('error', function(){
                console.log('ERRRRRRROR')
            })
        });
    }


};

AdamEIP.prototype.resendReadPacket = function(){
    var self = this;
    clearTimeout(self.resend);
    self.sendReadPacket();

};

AdamEIP.prototype.getDi = function(){
    var self = this;
    return self.diArr;

};
AdamEIP.prototype.sendReadPacket = function() {
    var self = this;
    var i, j, curLength, routerLength;
    var flagReconnect = false;

    console.log("SendReadPacket called",1,self.connectionID);

        curLength = 0;
        routerLength = 0;

        // We always need an EIP header with the CIP interface handle, etc.
        self.EIP_CIP_Header.copy(self.readReq, curLength);
        curLength = self.EIP_CIP_Header.length;
        //console.log('1Read req is ', self.readReq.toString('hex').substring(0,curLength*2),'  Length is ',curLength);

        // This is the session handle that goes in the EIP header
        self.readReq.writeInt32LE(self.sessionHandle,4);
        //console.log('2Read req is ', self.readReq.toString('hex').substring(0,curLength*2),'  Length is ',curLength);
        // Sometimes we need the ask the message router to send the message for us.  That's what the routing header is for.
        if (self.Connection_Path.length > 0) {
            self.Routing_Header.copy(self.readReq, curLength);
            curLength += self.Routing_Header.length;
            routerLength = self.Routing_Header.length;
            //console.log('3Read req is ', self.readReq.toString('hex').substring(0,curLength*2),'  Length is ',curLength,routerLength);
        }

        // We always need the PCCC encapsulation header (0x4b) which sends the final message to the PCCC object of the controller.
        self.PCCC_Encapsulation_Header.copy(self.readReq, curLength);
        curLength += self.PCCC_Encapsulation_Header.length;
        //console.log('4Read req is ', self.readReq.toString('hex').substring(0,curLength*2),'  Length is ',curLength);
        // Write the sequence number to the offset in the PCCC encapsulation header.  Eventually this should be moved to within the FOR loop if we keep a FOR loop.  But with only one PCCC command per packet we don't care.
        //self.readReq.writeUInt16LE(self.readPacketArray[i].seqNum, curLength - 2); // right at the end of the PCCC encapsulation header
        //console.log('5Read req is ', self.readReq.toString('hex').substring(0,curLength*2),'  Length is ',curLength);
        // The FOR loop is left in here for now, but really we are only doing one request per packet for now.

        if (routerLength && ((self.PCCC_Encapsulation_Header.length) % 2)) {
            self.readReq[curLength] = 0x00;  // Pad byte
            curLength += 1;
            routerLength += 1;  // Important as this counts towards the length written to the message
            //console.log('7Read req is ', self.readReq.toString('hex').substring(0,curLength*2),'  Length is ',curLength);
        }

        // Now we add the connection path length.
        if (routerLength > 0) {
            self.Connection_Path.copy(self.readReq, curLength);
            curLength += self.Connection_Path.length;
            routerLength += self.Connection_Path.length;
            //console.log('8Read req is ', self.readReq.toString('hex').substring(0,curLength*2),'  Length is ',curLength);
        }

        // This is the overall message length for the EIP header
        self.readReq.writeUInt16LE(curLength - 24, 2);
        //console.log('9Read req is ', self.readReq.toString('hex').substring(0,curLength*2),'  Length is ',curLength);
        console.log("The PCCC Encapsulation Header is:", 2);
        console.log(self.PCCC_Encapsulation_Header, 2);

        // This is the overall message length for either the message sent to the message router OR the message sent to the controller directly if we aren't using a router.
        self.readReq.writeUInt16LE( self.PCCC_Encapsulation_Header.length + routerLength, 38); //returnedBfr.length +
        //console.log('10Read req is ', self.readReq.toString('hex').substring(0,curLength*2),'  Length is ',curLength);
        if (routerLength > 0) {
            // This is the message length of the "message in a message" to notify the message router.
            //self.readReq.writeUInt16LE(returnedBfr.length + self.PCCC_Encapsulation_Header.length, self.EIP_CIP_Header.length + self.Routing_Header.length - 2);
            //console.log('11Read req is ', self.readReq.toString('hex').substring(0,curLength*2),'  Length is ',curLength);
        }

        if (self.isoConnectionState == 4) {

            self.isoclient.write(self.readReq.slice(0,curLength));  // was 31

            //console.log('12Read req is ', self.readReq.toString('hex').substring(0,curLength*2),'  Length is ',curLength);
        } else {

            if (!flagReconnect) {
                // Prevent duplicates
                console.log('Not Sending Read Packet because we are not connected - ISO CS is ' + self.isoConnectionState,0,self.connectionID);
            }
            // This is essentially an instantTimeout.
            if (self.isoConnectionState == 0) {
                flagReconnect = true;
            }

        }


    if (flagReconnect) {
        setTimeout(function() {
//			console.log("Next tick is here and my ID is " + self.connectionID);
            console.log("The scheduled reconnect from sendReadPacket is happening now",1,self.connectionID);
            self.connectNow(self.connectionParams);  // We used to do this NOW - not NextTick() as we need to mark isoConnectionState as 1 right now.  Otherwise we queue up LOTS of connects and crash.
        }, 0);
    }

};
AdamEIP.prototype.connectError = function(e) {
    var self = this;

    // Note that a TCP connection timeout error will appear here.  An ISO connection timeout error is a packet timeout.
    console.log('We Caught a connect error ' + e.code,0,self.connectionID);

    self.isoConnectionState = 0;

    //Retry CONNECTION
    setTimeout(function(){
        self.connectNow(self.connectionParams);
        return null;
    }, self.retryTime)


};
AdamEIP.prototype.packetTimeout = function(packetType) {
    console.log(packetType);
    var self = this;
    console.log('PacketTimeout called with type ' + packetType + ' and seq ' ,1,self.connectionID);
    if (packetType === "connect") {
        console.log("TIMED OUT waiting for EIP Connection Response from the PLC - Disconnecting",0,self.connectionID);
        console.log("Wait for 2 seconds then try again.",0,self.connectionID);
        self.connectionReset();
        console.log("Scheduling a reconnect from packetTimeout, connect type",0,self.connectionID);
        setTimeout(function(){
            console.log("The scheduled reconnect from packetTimeout, connect type, is happening now",0,self.connectionID);
            self.connectNow.apply(self,arguments);
        }, 2000, self.connectionParams);
        return undefined;
    }
    if (packetType === "read") {
        console.log("READ TIMEOUT on sequence number ",self.connectionID);
        //self.readResponse(undefined, self.findReadIndexOfSeqNum(packetSeqNum));
        return undefined;
    }

    console.log("Unknown timeout error.  Nothing was done - this shouldn't happen.",0,self.connectionID);
};
AdamEIP.prototype.connectionReset = function() {
    var self = this;
    self.isoConnectionState = 0;
    self.resetPending = true;
    console.log('ConnectionReset is happening');
    //self.resetTimeout = setTimeout(function() {
        self.resetNow.apply(self, arguments);
    //} ,1000);
};
AdamEIP.prototype.resetNow = function() {
    var self = this;
    self.isoConnectionState = 0;

    if(typeof(self.udpCLient) !== 'undefined'){
        self.udpCLient.removeAllListeners('message');
        setTimeout(function(){
            self.udpCLient.close();
            console.log('UDP client closed');
            self.closeUDPNotFired = setTimeout(function(){
                if(typeof(self.udpCLient) !== 'undefined'){
                    self.udpCLient.removeAllListeners('error');
                    self.udpCLient.removeAllListeners('close');
                    self.udpCLient = undefined;

                }
                console.log('CLOSED_WHEN_NOT_FIRED');
                self.onClientDisconnect();

            },5000);
        },2000);
        self.udpCLient.on('close', function(){

            self.udpCLient.removeAllListeners('message');
            self.udpCLient.removeAllListeners('error');
            self.udpCLient.removeAllListeners('close');
            self.udpCLient = undefined;
            console.log('CLOSED');
                //self.isoclient.end();
            setTimeout(function(){
                    self.onClientDisconnect();
                    clearTimeout(self.closeUDPNotFired);
            },1000);

        })
    }


    //self.connectionCleanup();

    console.log('ResetNOW is happening');
    self.resetPending = false;
    // In some cases, we can have a timeout scheduled for a reset, but we don't want to call it again in that case.
    // We only want to call a reset just as we are returning values.  Otherwise, we will get asked to read // more values and we will "break our promise" to always return something when asked.
    if (typeof(self.resetTimeout) !== 'undefined') {
        clearTimeout(self.resetTimeout);
        self.resetTimeout = undefined;
        console.log('Clearing an earlier scheduled reset');
    }
    //self.connectNow(self.connectionParams);
};
AdamEIP.prototype.readWriteError = function(e) {
    var self = this;
    console.log('We Caught a read/write error ' + e.code + ' - resetting connection',0,self.connectionID);
    self.isoConnectionState = 0;
    self.connectionReset();
};
AdamEIP.prototype.connectionCleanup = function() {
    var self = this;
    self.isoConnectionState = 0;
    console.log('Connection cleanup is happening');
    if (typeof(self.isoclient) !== "undefined") {
        self.isoclient.removeAllListeners('data');
        self.isoclient.removeAllListeners('error');
        self.isoclient.removeAllListeners('connect');
        self.isoclient.removeAllListeners('end');
    }
    clearTimeout(self.connectTimeout);
};
function decimalToHexString(number)
{
    if (number < 0)
    {
        number = 0xFFFFFFFF + number + 1;
    }
    return "0x" + number.toString(16).toUpperCase();
}
AdamEIP.prototype.onClientDisconnect = function() {
    var self = this;
    console.log('EIP/TCP DISCONNECTED.');
    self.connectionCleanup();
    self.connectNow(self.connectionParams);
};


module.exports = AdamEIP;