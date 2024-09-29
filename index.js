const express = require("express"); 
 const mongoose = require("mongoose");

const {Server} = require("socket.io")
const {createServer} = require("http");
const { timeStamp } = require("console");
const port = 3000;

const app = express();

app.use(express.json());

const mongoUri = 'mongodb://localhost:27017/ChatAppWithNodeJs';



mongoose.connect(mongoUri,{useNewUrlParser:true, useUnifiedTopology:true})
.then(()=>console.log('Monogodb Connected'))
.catch(err=>console.log(err));

//User Schema
const userSchema = new mongoose.Schema({
    username:{type:String, required:true}
})

const User= mongoose.model('User',userSchema);

const messageSchema = new mongoose.Schema({
    senderId: {type:mongoose.Schema.ObjectId, ref: 'User', required:true},
    receiverId: {type:mongoose.Schema.ObjectId, ref: 'User', required:true},
    message: {type:String, required: true},
    timeStamp:{type: Date, default:Date.now}
})

const Message =  mongoose.model('Message',messageSchema);

const chatRoomSchema =  new mongoose.Schema({
    chatRoomId : {type: String, required: true, unique:true},
    users: [{type:mongoose.Schema.Types.ObjectId, ref:'User'}],
    messages :[{type:mongoose.Schema.Types.ObjectId, ref: 'Message'}]
});

const ChatRoom =mongoose.model('ChatRoom', chatRoomSchema);


const createChatRoomId  = (id1,id2)=>{
    return [id1,id2].sort().join('_');
};


// Routes
app.post('/addUser', async(req,res)=>{

    const { username } =req.body;
    
    if(!username)
    {
        return res.status(400).send('Username is required')
    }
    try{
        const newUser= new User({username});
        await newUser.save();
        res.status(201).json({username});
    }
    catch(err)
    {
        //
        res.status(500).json({error: 'Internal Server Error'});
    }

})

app.post('/send-messsage', async(req,res)=>{

    const {senderId, receiverId, message} = req.body

    if(!senderId|| !receiverId || !message)
    {
        return res.status(400).send('Sender Id, recever id a message is required');
    }

    try{
        const sender = await User.findById(senderId);
        const receiver = await User.findById(receiverId);

        if(!sender || !receiver)
        {
            return res.status(404).send('Sender recever not found');
        }

        const chatRoomId = createChatRoomId(senderId,receiverId);

        let chatRoom = await ChatRoom.findOne({chatRoomId});

        // creating the instance of chatroom for  p2p user if it doesnot exist
        if(!chatRoom)
        {
            chatRoom = new ChatRoom(
                {
                    chatRoomId,
                    users: [senderId,receiverId],
                    messages :[]
                }
            );
            await chatRoom.save();
        }
 
        const newMessage = new Message({
            senderId:senderId,
            receiverId:receiverId,
            message
        });

        const savedMessage = await newMessage.save();
        // adding messages to chatroom of p2p user


        chatRoom.messages.push(savedMessage._id)
        await chatRoom.save();

        res.status(201).json(savedMessage);

    }catch(err)
    {
        console.log(err);
        res.status(500).json({error: "Internal seve error "})
    }
})




















app.get('/getusers', async(req, res)=>{

    try{
        const users= await User.find();
        res.status(200).json(users);
    }
    catch(err)
    {
        res.status(500).json({error: 'Cannot retrieve users error'})
    }
})

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