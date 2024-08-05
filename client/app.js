const socket = io();

document.getElementById('submitNameButton').addEventListener('click', () => {
    const nameInput = document.getElementById('nameInput').value;
    if (nameInput) {
        socket.emit('submitName', nameInput);
    }
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
    displayHand(hand);
    displayTable(table);
});

function updatePlayerCount(players) {
    document.getElementById('playerCount').textContent = `${players.length}/4 players`;
}

function displayHand(hand) {
    const handContainer = document.getElementById('playerHand');
    handContainer.innerHTML = '';
    hand.forEach(card => {
        const cardElement = document.createElement('li');
        cardElement.innerHTML = `<div class="card-number">${card.card}</div><div class="card-value">${card.value}</div>`;
        handContainer.appendChild(cardElement);
    });
}

function displayTable(table) {
    const tableContainer = document.getElementById('table');
    tableContainer.innerHTML = '';
    table.forEach((row, index) => {
        const rowElement = document.createElement('li');
        rowElement.innerHTML = `<div class="card-number">${row[0].card}</div><div class="card-value">${row[0].value}</div>`;
        tableContainer.appendChild(rowElement);
    });
}
