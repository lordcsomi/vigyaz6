const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3001;

app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

class CardGenerator {
    static generateCards() {
        const cards = [];
        for (let i = 1; i <= 104; i++) {
            let value = 1;
            if (i % 10 === 5) value += 1;
            if (i % 10 === 0) value += 2;
            if (i % 11 === 0) value += 4;
            if (i === 55) value = 7;
            cards.push({ card: i, value });
        }
        return cards;
    }

    static shuffleCards(cards) {
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
    }

    static dealCards(cards, numPlayers, cardsPerPlayer) {
        const hands = Array.from({ length: numPlayers }, () => []);
        let playerIndex = 0;
        for (let i = 0; i < numPlayers * cardsPerPlayer; i++) {
            hands[playerIndex].push(cards.pop());
            playerIndex = (playerIndex + 1) % numPlayers;
        }
        return hands;
    }

    static setupTable(cards, numRows) {
        const rows = [];
        for (let i = 0; i < numRows; i++) {
            if (cards.length > 0) {
                rows.push([cards.pop()]);
            } else {
                rows.push([]);
            }
        }
        return rows;
    }
}

const numPlayers = 2;
const cardsPerPlayer = 10;
let players = [];
let gameStarted = false;

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

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
