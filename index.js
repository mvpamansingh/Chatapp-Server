const express = require("express"); 
 
const {Server} = require("socket.io")
const {createServer} = require("http")
const port = 3000;



const app = express();
const server = createServer(app);
const io = new Server(server,{
    cors:{

        origin:"*",
        methods:["GET","POST"],
        credentials:true
    }
});

io.on("connection", (socket) => {
    console.log("A user connected");
    console.log("User connected with id: " + socket.id);
});

server.listen(port, '0.0.0.0',() => {
    console.log("Server is running on port "+ port);
});


app.get("/", (req, res) => {
    res.send("Hello World");
});



/*


If xlient is not connecting to server (localhost)

Reason - Your client is connecting to diff IP address and not the one on ip which server is currently running


if IP adress of server is changing continously 

Reson - it is because the network we are connected like WIFI airtel  , is changing the ip address every 30 second
FIX -  try to connect ll the device on one cellur mobile data newtwork  - PC , MOBILE 1 , MOBILE 2 ....

Also  Turn off the FIREWALL of your PC where server is running


Take care of CORS 

*/