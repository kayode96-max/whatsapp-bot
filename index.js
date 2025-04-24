const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "bot" })
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Bot is ready!');
});

client.on('message', async (msg) => {
    const chat = await msg.getChat();

    if (msg.body === '!tagall' && chat.isGroup) {
        let text = '';
        let mentions = [];
        for (let participant of chat.participants) {
            const contact = await client.getContactById(participant.id._serialized);
            mentions.push(contact);
            text += `@${contact.number} `;
        }
        await chat.sendMessage(text, { mentions });
    }

    if (msg.body.startsWith('!broadcast') && chat.isGroup) {
        const sender = await msg.getContact();
        const isAdmin = chat.participants.find(p => p.id._serialized === sender.id._serialized && p.isAdmin);
        if (isAdmin) {
            const broadcast = msg.body.slice(10).trim();
            if (broadcast) chat.sendMessage(`*Broadcast:* ${broadcast}`);
            else chat.sendMessage('Please type a message to broadcast.');
        } else {
            msg.reply('Only admins can use this command.');
        }
    }

    const autoReplies = {
        'hi': 'Hello! How can I help you?',
        'hello': 'Hey there!',
        'help': 'Available commands: !tagall, !broadcast [message], !features',
        'bye': 'Goodbye!'
    };

    const lower = msg.body.toLowerCase();
    if (autoReplies[lower]) {
        msg.reply(autoReplies[lower]);
    }

    if (msg.body.includes('http') && chat.isGroup) {
        const sender = await msg.getContact();
        const isAdmin = chat.participants.find(p => p.id._serialized === sender.id._serialized && p.isAdmin);
        if (!isAdmin) {
            msg.delete(true);
            chat.sendMessage(`Link deleted from @${sender.number}`, { mentions: [sender] });
        }
    }

    if (msg.body === '!features') {
        msg.reply(`*Bot Features:*
- !tagall — Mention all group members
- !broadcast [msg] — Admin-only group announcement
- Auto replies — hi, hello, help, bye
- Deleted message recovery
- Welcome/goodbye messages
- Anti-link deletion (non-admin only)`);
    }
});

client.on('message_revoke_everyone', async (after, before) => {
    if (before) {
        const chat = await before.getChat();
        const contact = await before.getContact();
        chat.sendMessage(`@${contact.number} deleted: "${before.body}"`, { mentions: [contact] });
    }
});

client.on('group_join', async (notification) => {
    const chat = await notification.getChat();
    const contact = await notification.getContact();
    chat.sendMessage(`Welcome @${contact.number} to *${chat.name}*!`, { mentions: [contact] });
});

client.on('group_leave', async (notification) => {
    const chat = await notification.getChat();
    const contact = await notification.getContact();
    chat.sendMessage(`@${contact.number} left *${chat.name}*. Goodbye!`, { mentions: [contact] });
});

client.initialize();
