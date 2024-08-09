const socket = io();
let selectedCardElement = null;
let selectedCardCard = null;    
let dTable = []
let click_on = null
let myhand = []
let chooseRow = false


document.getElementById('submitNameButton').addEventListener('click', () => {
    const nameInput = document.getElementById('nameInput').value;
    if (nameInput) {
        socket.emit('submitName', nameInput);
    }
});

socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    location.reload();
    
});

socket.on('nameAccepted', ({ success, players }) => {
    if (success) {
        document.getElementById('nameInputContainer').style.display = 'none';
        document.getElementById('waitingMessageContainer').style.display = 'block';
        updatePlayerCount(players);
    } else {
        alert('Game is full.');
    }
});

socket.on('playerUpdate', (players) => {
    updatePlayerCount(players);
});

socket.on('gameStart', ({ hand, table, players }) => {
    document.getElementById('waitingMessageContainer').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'block';
    hand.sort((a, b) => a.card - b.card);
    myhand = hand
    displayHand(myhand);
    displayTable(table);
});

socket.on('new_card_can_be_selected', () => {
    console.log('New card can be selected');
    console.log('selected card to be removed', selectedCardCard);
    myhand = myhand.filter(card => card !== selectedCardCard);
    enableAllCards();
    displayHand(myhand);
});

socket.on('placeCard', (table, row, column) => {
    console.log('placeCard at row', row, 'column', column);
    const selectedCell = dTable[row][column];
    click_on = selectedCell
    selectedCell.classList.add('yellow-outline');
});

socket.on('updateTable', (table) => {
    console.log('Updating table:', table);
    displayTable(table);
});

socket.on('chooseRow', () => {
    console.log('Choose a row');
    alert('Choose a row');
    chooseRow = true
});

socket.on('gameOver', (players) => {
    console.log('Game over, players:', players);
    document.body.innerHTML = '<div id="leaderboard">Leaderboard</div>';
    const leaderboard = document.getElementById('leaderboard');
    leaderboard.style.fontSize = '24px';
    leaderboard.style.fontWeight = 'bold';
    leaderboard.style.textAlign = 'center';
    players.forEach(player => {
        const playerElement = document.createElement('div');
        playerElement.style.fontSize = '18px';
        playerElement.style.margin = '10px';
        playerElement.textContent = `${player.name}: ${player.points} points`;
        leaderboard.appendChild(playerElement);
    });
    setTimeout(() => {
        location.reload();
    }, 10000);
});

function updatePlayerCount(players) {
    document.getElementById('playerCount').textContent = `${players.length}/4 players`;
}

function displayHand(hand) {
    const handContainer = document.getElementById('playerHand');
    handContainer.innerHTML = '';
    hand.forEach(card => {
        const cardElement = document.createElement('li');
        cardElement.innerHTML = `<div class="card-number">${card.card}</div><div class="card-value">${card.bullheads}</div>`;
        cardElement.addEventListener('click', () => {
            selectCard(cardElement, card);
        });
        handContainer.appendChild(cardElement);
    });
}

function displayTable(table) {
    const tableContainer = document.getElementById('table');
    tableContainer.innerHTML = '';
    dTable = []
    for (let i = 0; i < 4; i++) {
        row = []
        for (let j = 0; j < 6; j++) {
            const cellElement = document.createElement('li');
            cellElement.addEventListener('click', () => {
                cardClicked(i, j, cellElement);
            });
            if (j === 5) {
                cellElement.classList.add('red-outline', 'shadow-card');
            } else if (j > 0) {
                cellElement.classList.add('shadow-card');
            }
            // Check if there is a card in the current position
            if (table[i] && table[i][j]) {
                const card = table[i][j];
                cellElement.classList.remove('shadow-card');
                cellElement.innerHTML = `<div class="card-number">${card.card}</div><div class="card-value">${card.bullheads}</div>`;
            }
            row.push(cellElement);
            tableContainer.appendChild(cellElement);
        }
        dTable.push(row);
    }
    console.log(dTable);
}

function selectCard(cardElement, card) {
    console.log('Card selected:', card);
    if (selectedCardElement) {
        console.log('A card is already selected, do nothing');
        return; // A card is already selected, do nothing
    };
    selectedCardCard = card;
    selectedCardElement = cardElement;
    cardElement.classList.add('selected-card');
    disableOtherCards(cardElement);
    socket.emit('cardSelected', card);
}

function disableOtherCards(selectedCardElement) {
    const handContainer = document.getElementById('playerHand');
    const cards = handContainer.querySelectorAll('li');
    cards.forEach(card => {
        if (card !== selectedCardElement) {
            card.style.pointerEvents = 'none';
            card.style.opacity = '0.5';
        }
    });
}

function cardClicked(row, col, cellElement) {
    console.log(`Card clicked at row ${row}, col ${col}, cellElement`, cellElement);
    if (click_on == cellElement) {
        socket.emit('cardPlaced', row, col);
        cellElement.classList.remove('yellow-outline');
    }
    if (chooseRow) {
        socket.emit('rowSelected', row);
        chooseRow = false;
    }
}

function enableAllCards() {
    const handContainer = document.getElementById('playerHand');
    const cards = handContainer.querySelectorAll('li');
    cards.forEach(card => {
        card.style.pointerEvents = 'auto';
        card.style.opacity = '1';
    });
    if (selectedCardElement) {
        selectedCardElement.classList.remove('selected-card');
        selectedCardElement = null;
    }
}
