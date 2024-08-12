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
const PORT = process.env.PORT || 80;
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
const numRows = 4;
let round = 0;
let currentPlayer = 0;
let players = [];
let playerPoints = [];
let gameStarted = false;
let table = [];
let hands = [];
let playerCards = [];
let state = 'waitingForCards';
let waitingForPlayer = null;
let currentWaitingCard = null;


// ------------------
// Socket
// ------------------
io.on('connection', (socket) => {

    socket.on('submitName', (name) => {
        console.log(`Player ${socket.id} set name: ${name}`);
        if (players.length < numPlayers) {
            players.push({ id: socket.id, name });
            playerPoints.push({ id: socket.id, name: name, points: 0 });
            socket.emit('nameAccepted', { success: true, players, socketId: socket.id });

            if (players.length === numPlayers && !gameStarted) {
                console.log('Game starting with players:', players);
                startGame();
            }
        } else {
            socket.emit('nameAccepted', { success: false, message: 'Game is full' });
        }
        io.emit('playerUpdate', players);
    });

    socket.on('reconnect', (cookie) => {
        console.log(`Player ${cookie}  try reconnecting`);
        const player = players.find(player => player.id === cookie);
        if (player) {
            const playerIndex = players.findIndex(player => player.id === cookie);
            if (playerIndex !== -1) {
                players[playerIndex].id = socket.id;
                playerPoints[playerIndex].id = socket.id;
                console.log(`---- Player ${players[playerIndex].name} reconnected with new socket id: ${socket.id} ----`);
                socket.emit('reconnected', { success: true, message: 'Reconnected', state: gameStarted });
                socket.emit('nameAccepted', { success: true, players, socketId: socket.id });
                if (gameStarted) {

                    socket.emit('gameStart', { hand: hands[playerIndex], table, players });
                    socket.emit('updateTable', table);

                    if (state === 'waitingForCards') {
                        socket.emit('new_card_can_be_selected');
                    }
                    if (state === 'playerTurn') {
                        handlePlayer();
                    }
                }
            } else {
                console.log(`Player ${cookie} reconnection failed`);
                socket.emit('reconnected', { success: false, message: 'Invalid cookie' });
            }
            
            
        } else {
            console.log(`Player ${cookie} reconnection failed`);
            socket.emit('reconnected', { success: false, message: 'Invalid cookie' });
        }
    });

    socket.on('cardSelected', (card) => {
        console.log(`Player ${socket.id} selected card:`, card);
        if (gameStarted && state === 'waitingForCards') {
            const currentPlayer = players.find(player => player.id === socket.id);
            if (!playerCards.some(pc => pc.player.id === currentPlayer.id)) {
                playerCards.push({ player: currentPlayer, card });
            }
            if (playerCards.length === numPlayers) {
                console.log('All players have selected cards:');
                startRound();
                handlePlayer();
            }
        }
    });

    socket.on('cardPlaced', ( row, col) => {
        if (socket.id === waitingForPlayer) {

            if (table[row].length >= 5) {
                console.log(`Row ${row} is already full`);
                const bullheads = table[row].reduce((total, card) => total + card.bullheads, 0);
                console.log(`Player ${socket.id} got ${bullheads} bullheads`);
                playerPoints.find(player => player.id === socket.id).points += bullheads;
                table[row] = [];
                table[row].push(currentWaitingCard);
            }
            else {
                table[row].push(currentWaitingCard);
                console.log(`Player ${socket.id} placed card in row ${row} column ${col}`);
            }
            
            removeCardFromHand(currentWaitingCard.card);
            nextPlayer();

        }

    });

    socket.on('rowSelected', (row) => {
        if (socket.id === waitingForPlayer) {
            console.log(`Player ${socket.id} selected row:`, row);
            const selectedRow = table[row];
            const bullheads = selectedRow.reduce((total, card) => total + card.bullheads, 0);
            console.log(`Player ${socket.id} got ${bullheads} bullheads`);
            playerPoints.find(player => player.id === socket.id).points += bullheads;
            table[row] = [];
            table[row].push(currentWaitingCard);

            removeCardFromHand(currentWaitingCard.card);
            nextPlayer();
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

function startGame() {
    const cards = CardGenerator.generateCards();
    CardGenerator.shuffleCards(cards);
    hands = CardGenerator.dealCards(cards, numPlayers, cardsPerPlayer);
    table = CardGenerator.setupTable(cards, numRows);
    console.log(table);

    players.forEach((player, index) => {
        io.to(player.id).emit('gameStart', { hand: hands[index], table, players });
        console.log(`Player ${player.name} has hand:`, hands[index]);
    });

    gameStarted = true;
    console.log()
}

function startRound() {
    playerCards.sort((a, b) => a.card.card - b.card.card);
    console.log('Sorted cards:', playerCards);
    state = 'playerTurn';
}

function handlePlayer() {
    console.log(`${playerCards[currentPlayer].player.name}'s turn with ${playerCards[currentPlayer].card.card}`);
    const lastCards = table.map(row => row[row.length - 1].card);
    const currentPlayerCard = playerCards[currentPlayer].card.card;

    // Check if the current player's card is smaller than all the last cards in each row
    const isSmaller = lastCards.every(card => currentPlayerCard < card);
    console.log('Last cards on table:', lastCards, 'Current player card:', currentPlayerCard, 'Is Smaller:', isSmaller);

    if (isSmaller) {
        waitingForPlayer = playerCards[currentPlayer].player.id;
        currentWaitingCard = playerCards[currentPlayer].card;
        io.to(playerCards[currentPlayer].player.id).emit('chooseRow', table);
        console.log(`Waiting for ${playerCards[currentPlayer].player.name} to choose a row`);
    } else {
        const closestRow = calcCardPlace();
        waitingForPlayer = playerCards[currentPlayer].player.id;
        currentWaitingCard = playerCards[currentPlayer].card;
        io.to(playerCards[currentPlayer].player.id).emit('placeCard', table, closestRow, table[closestRow].length);
        console.log(`Waiting for ${playerCards[currentPlayer].player.name} to place the card`);
    }
}

function calcCardPlace() {
    const currentPlayerCard = playerCards[currentPlayer].card.card;
    const lastCards = table.map(row => row[row.length - 1].card);
    let closestRow = null;
    let smallestDifference = Infinity;

    lastCards.forEach((card, index) => {
        if (card < currentPlayerCard) {
            const difference = currentPlayerCard - card;
            if (difference < smallestDifference) {
                smallestDifference = difference;
                closestRow = index;
            }
        }
    });

    console.log(`Closest row is ${closestRow}`);
    return closestRow;
}

function gameOver() {
    console.log('Game over');
    console.log('Player points:', playerPoints);
    const leaderboard = playerPoints.sort((a, b) => a.points - b.points);
    console.log('Leaderboard:', leaderboard);

    io.emit('gameOver', leaderboard);
    setTimeout(() => {
        console.log('Restarting the program...');

        // Reset all the game variables
        round = 0;
        currentPlayer = 0;
        players = [];
        playerPoints = [];
        gameStarted = false;
        table = [];
        hands = [];
        playerCards = [];
        state = 'waitingForCards';
        waitingForPlayer = null;
        currentWaitingCard = null;

    }, 10000);
}

function removeCardFromHand(card) {
    hands[currentPlayer].splice(hands[currentPlayer].findIndex(c => c.card === card), 1);
}

function nextPlayer() {

    io.emit('updateTable', table);

    currentPlayer++;
    if (currentPlayer === numPlayers) {
        currentPlayer = 0;
        state = 'waitingForCards';
        playerCards = [];
        round++;
        if (round === 10) {
            gameOver();
            return
        }
        io.emit('new_card_can_be_selected');
        
    }
    if (state === 'playerTurn') {
        handlePlayer();
    }
}
