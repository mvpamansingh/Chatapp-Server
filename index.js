const express = require("express"); 
 const mongoose = require("mongoose");

const {Server} = require("socket.io")
const {createServer} = require("http");
const { timeStamp } = require("console");
const port = 3000;

const app = express();

app.use(express.json());

const mongoUri = 'mongodb://localhost:27017/ChatAppWithNodeJsV1';



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

        io.emit('newMessage', savedMessage);
        res.status(201).json(savedMessage);

    }catch(err)
    {
        console.log(err);
        res.status(500).json({error: "Internal seve error "})
    }
})

app.get("/messages/:chatRoomId", async(req,res)=>{

    const {chatRoomId} = req.params;


    try{
        const chatRoom = await ChatRoom.findOne({chatRoomId}).populate('messages')

        if(!chatRoom)
        {
            return res.status(404).json({error:"Chat room not found"});
        }

         res.json(chatRoom.messages);
    }
    catch(err)
    {
        console.log(err)
        res.status(500).json({error:"Internal server Error "})
    }
});





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

    socket.on('disconnect', ()=>{
        console.log(`user disconnected ${socket.id}`)
    })
});

server.listen(port, '0.0.0.0',() => {
    console.log("Server is running on port "+ port);
});


app.get("/", (req, res) => {
    res.send("Hello World");
});






// Group chat Schema

const groupChatSchema = new mongoose.Schema({
    name: { type: String, required: true },

  });
  
  const GroupChat = mongoose.model('GroupChat', groupChatSchema);
  
  // Conversation Schema
  const conversationSchema = new mongoose.Schema({
    message: { type: String, required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now },
    groupChatId: { type: mongoose.Schema.Types.ObjectId, ref: 'GroupChat', required: true } 
  });
  
  const Conversation = mongoose.model('Conversation', conversationSchema);
  
  // Group Chat Room Messages Schema
  const groupChatRoomMessagesSchema = new mongoose.Schema({
    groupChatId: { type: mongoose.Schema.Types.ObjectId, ref: 'GroupChat', required: true },
    messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' }]
  });
  
  const GroupChatMessages = mongoose.model('GroupChatMessages', groupChatRoomMessagesSchema);



// Group chat Apis


app.post('/create-group', async (req, res) => {
    const groupName = req.body.name;
  
    if (!groupName) {
      return res.status(400).json({ error: 'Group name are required' });
    }
  
    try {

  
      const newGroup = new GroupChat({
        name: groupName,
      });
  
      await newGroup.save();
  
      const newGroupChatRoomMessages = new GroupChatMessages({
        groupChatId: newGroup._id,
        messages: []
      });
  
      await newGroupChatRoomMessages.save();
  
      res.status(201).json({
        message: 'Group created successfully',
        group: {
          id: newGroup._id,
          name: newGroup.name,
          members: newGroup.members
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

app.get('/get-groups', async (req, res) => {
    try {
      const groups = await GroupChat.find({}, 'name');
      
      const formattedGroups = groups.map(group => ({
        _id: group._id,
        name: group.name
      }));
  
      res.status(200).json(formattedGroups);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });


app.get('/fetch-group-messages/:groupId', async (req, res) => {
  const { groupId } = req.params;

  if (!groupId) {
    return res.status(400).json({ error: 'Group ID is required' });
  }

  try {
    const groupChatMessages = await GroupChatMessages.findOne({ groupChatId: groupId })
      .populate({
        path: 'messages',
        populate: {
          path: 'senderId',
          select: 'username'
        }
      });

    if (!groupChatMessages) {
      return res.status(404).json({ error: 'Group chat not found' });
    }

    const formattedMessages = groupChatMessages.messages.map(msg => ({
      message: msg.message,
      senderName: msg.senderId.username,
      senderId:msg.senderId._id,
      timestamp: msg.timestamp
    }));

    res.status(200).json(formattedMessages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ... existing code ...

app.post('/save-group-message', async (req, res) => {
    const { message, senderId, groupChatId } = req.body;
  
    if (!message || !senderId || !groupChatId) {
      return res.status(400).json({ error: 'Message, sender ID, and group chat ID are required' });
    }
  
    try {
      // Create and save the new conversation (message)
      const newConversation = new Conversation({
        message,
        senderId,
        groupChatId
      });
      const savedConversation = await newConversation.save();
  
      // Find the group chat messages document and update it
      const groupChatMessages = await GroupChatMessages.findOne({ groupChatId });
  
      if (!groupChatMessages) {
        return res.status(404).json({ error: 'Group chat not found' });
      }
  
      // Add the new message ID to the group chat messages
      groupChatMessages.messages.push(savedConversation._id);
      await groupChatMessages.save();
  
      // Emit the new message to all connected clients
    //   io.emit('newGroupMessage', {
    //     groupId: groupChatId,
    //     message: savedConversation
    //   });
  
      res.status(201).json({
        message: 'Group message saved successfully',
        savedMessage: savedConversation
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // ... rest of the existing code ...





















/*


If xlient is not connecting to server (localhost)

Reason - Your client is connecting to diff IP address and not the one on ip which server is currently running


if IP adress of server is changing continously 

Reson - it is because the network we are connected like WIFI airtel  , is changing the ip address every 30 second
FIX -  try to connect ll the device on one cellur mobile data newtwork  - PC , MOBILE 1 , MOBILE 2 ....

Also  Turn off the FIREWALL of your PC where server is running


Take care of CORS 

*/