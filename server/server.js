const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const CardGenerator = require('./CardGenerator');


// ------------------ 
// Server setup
// ------------------
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3001;
app.use(express.static(path.join(__dirname, '../client')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


// ------------------
// Game setup
// ------------------
const numPlayers = 2;
const cardsPerPlayer = 10;
let players = [];
let gameStarted = false;


// ------------------
// Socket
// ------------------
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('submitName', (name) => {
        console.log(`Player name submitted: ${name}`);
        if (players.length < numPlayers) {
            players.push({ id: socket.id, name });
            socket.emit('nameAccepted', { success: true, players });

            if (players.length === numPlayers && !gameStarted) {
                startGame();
            }
        } else {
            socket.emit('nameAccepted', { success: false, message: 'Game is full' });
        }
        io.emit('playerUpdate', players);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
        players = players.filter(player => player.id !== socket.id);
        io.emit('playerUpdate', players);
    });
});

function startGame() {
    const cards = CardGenerator.generateCards();
    CardGenerator.shuffleCards(cards);
    const hands = CardGenerator.dealCards(cards, numPlayers, cardsPerPlayer);
    const numRows = 4;
    const table = CardGenerator.setupTable(cards, numRows);

    players.forEach((player, index) => {
        io.to(player.id).emit('gameStart', { hand: hands[index], table, players });
    });

    gameStarted = true;
}


