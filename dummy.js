
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


app.post('/fetch-group-messages', async (req, res) => {
  const { groupId } = req.body;

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
  