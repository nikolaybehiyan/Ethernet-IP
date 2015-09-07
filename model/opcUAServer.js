/*global require,setInterval,console... */
var opcua = require("node-opcua");


// Let's create an instance of OPCUAServer
function OpcUAServer(){
    this.server = undefined;
    this.adamParams = {
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
    };

}
OpcUAServer.prototype.createServer = function(callback){
    var self = this;
    self.server =  new opcua.OPCUAServer({

        port: 4580, // the port of the listening socket of the server
        resourcePath: "UA/Server", // this path will be added to the endpoint resource name
        buildInfo : {
            productName: "Server",
            buildNumber: "7658",
            buildDate: new Date(2014,5,2)
        }
    });
    callback(self.server);
};
OpcUAServer.prototype.getVar = function(di){
    var self = this;
    return self.adamParams[di];
};
OpcUAServer.prototype.getDIList = function(){
    var self = this;
    console.log(self.adamParams);

};
OpcUAServer.prototype.convertToBoolean = function(data){
    if(data == 1){
        return true;
    }else{
        return false;
    }
};
OpcUAServer.prototype.construct_my_address_space = function(){
    var self = this;
    var digitalInputs = self.adamParams;

    //console.log(self.server);
     //declare some folders
    console.log(digitalInputs);

        //console.log(self.server.engine)
        self.server.engine.addFolder("Objects",{ browseName: "MyDevice"});

        //console.log(self.adamParams.di1);

    // add variables in folders
    //
    self.server.nodeVariable1 = self.server.engine.addVariable("MyDevice",{
        nodeId: "ns=4;s=di0",
        browseName: "di0",
        dataType: "Boolean",
        value: {
            get: function () {
                return new opcua.Variant({dataType: opcua.DataType.Boolean, value: self.convertToBoolean(self.getVar('di0')) });
            }
        }
    });
    self.server.nodeVariable2 = self.server.engine.addVariable("MyDevice",{
        nodeId: "ns=4;s=di1",
        browseName: "di1",
        dataType: "Boolean",
        value: {
            get: function () {
                return new opcua.Variant({dataType: opcua.DataType.Boolean, value: self.convertToBoolean(self.getVar('di1')) });
            }
        }
    });
    self.server.nodeVariable3 = self.server.engine.addVariable("MyDevice",{
        nodeId: "ns=4;s=di2",
        browseName: "di2",
        dataType: "Boolean",
        value: {
            get: function () {
                return new opcua.Variant({dataType: opcua.DataType.Boolean, value: self.convertToBoolean(self.getVar('di2')) });
            }
        }
    });
    self.server.nodeVariable4 = self.server.engine.addVariable("MyDevice",{
        nodeId: "ns=4;s=di3",
        browseName: "di3",
        dataType: "Boolean",
        value: {
            get: function () {
                return new opcua.Variant({dataType: opcua.DataType.Boolean, value: self.convertToBoolean(self.getVar('di3')) });
            }
        }
    });
    self.server.nodeVariable5 = self.server.engine.addVariable("MyDevice",{
        nodeId: "ns=4;s=di4",
        browseName: "di4",
        dataType: "Boolean",
        value: {
            get: function () {
                return new opcua.Variant({dataType: opcua.DataType.Boolean, value: self.convertToBoolean(self.getVar('di4')) });
            }
        }
    });
    self.server.nodeVariable6 = self.server.engine.addVariable("MyDevice",{
        nodeId: "ns=4;s=di5",
        browseName: "di5",
        dataType: "Boolean",
        value: {
            get: function () {
                return new opcua.Variant({dataType: opcua.DataType.Boolean, value: self.convertToBoolean(self.getVar('di5')) });
            }
        }
    });
    self.server.nodeVariable7 = self.server.engine.addVariable("MyDevice",{
        nodeId: "ns=4;s=di6",
        browseName: "di6",
        dataType: "Boolean",
        value: {
            get: function () {
                return new opcua.Variant({dataType: opcua.DataType.Boolean, value: self.convertToBoolean(self.getVar('di6')) });
            }
        }
    });
    self.server.nodeVariable8 = self.server.engine.addVariable("MyDevice",{
        nodeId: "ns=4;s=di7",
        browseName: "di7",
        dataType: "Boolean",
        value: {
            get: function () {
                return new opcua.Variant({dataType: opcua.DataType.Boolean, value: self.convertToBoolean(self.getVar('di7')) });
            }
        }
    });
    self.server.nodeVariable9 = self.server.engine.addVariable("MyDevice",{
        nodeId: "ns=4;s=di8",
        browseName: "di8",
        dataType: "Boolean",
        value: {
            get: function () {
                return new opcua.Variant({dataType: opcua.DataType.Boolean, value: self.convertToBoolean(self.getVar('di8')) });
            }
        }
    });
    self.server.nodeVariable10 = self.server.engine.addVariable("MyDevice",{
        nodeId: "ns=4;s=di9",
        browseName: "di9",
        dataType: "Boolean",
        value: {
            get: function () {
                return new opcua.Variant({dataType: opcua.DataType.Boolean, value: self.convertToBoolean(self.getVar('di9')) });
            }
        }
    });
    self.server.nodeVariable11 = self.server.engine.addVariable("MyDevice",{
        nodeId: "ns=4;s=di10",
        browseName: "di10",
        dataType: "Boolean",
        value: {
            get: function () {
                return new opcua.Variant({dataType: opcua.DataType.Boolean, value: self.convertToBoolean(self.getVar('di10')) });
            }
        }
    });
    self.server.nodeVariable12 = self.server.engine.addVariable("MyDevice",{
        nodeId: "ns=4;s=di11",
        browseName: "di11",
        dataType: "Boolean",
        value: {
            get: function () {
                return new opcua.Variant({dataType: opcua.DataType.Boolean, value: self.convertToBoolean(self.getVar('di11')) });
            }
        }
    });
    self.server.nodeVariable13 = self.server.engine.addVariable("MyDevice",{
        nodeId: "ns=4;s=di12",
        browseName: "di12",
        dataType: "Boolean",
        value: {
            get: function () {
                return new opcua.Variant({dataType: opcua.DataType.Boolean, value: self.convertToBoolean(self.getVar('di12')) });
            }
        }
    });
    self.server.nodeVariable14 = self.server.engine.addVariable("MyDevice",{
        nodeId: "ns=4;s=di13",
        browseName: "di13",
        dataType: "Boolean",
        value: {
            get: function () {
                return new opcua.Variant({dataType: opcua.DataType.Boolean, value: self.convertToBoolean(self.getVar('di13')) });
            }
        }
    });
    self.server.nodeVariable15 = self.server.engine.addVariable("MyDevice",{
        nodeId: "ns=4;s=di14",
        browseName: "di14",
        dataType: "Boolean",
        value: {
            get: function () {
                return new opcua.Variant({dataType: opcua.DataType.Boolean, value: self.convertToBoolean(self.getVar('di14')) });
            }
        }
    });
    self.server.nodeVariable16 = self.server.engine.addVariable("MyDevice",{
        nodeId: "ns=4;s=di15",
        browseName: "di15",
        dataType: "Boolean",
        value: {
            get: function () {
                return new opcua.Variant({dataType: opcua.DataType.Boolean, value: self.convertToBoolean(self.getVar('di15')) });
            }
        }
    });
};
OpcUAServer.prototype.startServer = function(){
    var self = this;
    self.server.start(function() {
        console.log("Server is now listening ... ( press CTRL+C to stop)");
        console.log("port ", self.server.endpoints[0].port);
        var endpointUrl = self.server.endpoints[0].endpointDescriptions()[0].endpointUrl;
        console.log(" the primary server endpoint url is ", endpointUrl );
    });

};
OpcUAServer.prototype.initializeServer = function(){
    var self = this;
    self.adamParams = undefined;
    self.createServer(function(server){
        server.initialize(function(){
            self.construct_my_address_space();
            self.startServer();
        })
    });

};
OpcUAServer.prototype.setAdamParams = function(adamParams){
    var self = this;
    self.adamParams = adamParams;
};



module.exports = OpcUAServer;



