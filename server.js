const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

const users = new Map();
const messages = [];

io.on('connection', (socket) => {
    console.log('✅ Новый пользователь подключился:', socket.id);

    socket.on('user_join', (username) => {
        users.set(socket.id, { id: socket.id, username: username });
        
        socket.broadcast.emit('user_joined', {
            username: username,
            onlineCount: users.size
        });

        socket.emit('message_history', messages.slice(-50));
        io.emit('online_users', Array.from(users.values()));

        const systemMessage = {
            id: Date.now().toString(),
            username: 'Система',
            text: `👋 ${username} присоединился к чату`,
            timestamp: new Date(),
            type: 'system'
        };
        messages.push(systemMessage);
        io.emit('new_message', systemMessage);
    });

    socket.on('chat_message', (data) => {
        const user = users.get(socket.id);
        if (!user) return;

        const message = {
            id: Date.now().toString(),
            username: user.username,
            text: data.text,
            timestamp: new Date(),
            userId: socket.id,
            type: 'user'
        };

        messages.push(message);
        if (messages.length > 100) messages.shift();
        io.emit('new_message', message);
    });

    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            users.delete(socket.id);
            socket.broadcast.emit('user_left', {
                username: user.username,
                onlineCount: users.size
            });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
