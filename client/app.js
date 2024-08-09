const socket = io();

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
    displayHand(hand);
    displayTable(table);
});

socket.on('new_card_can_be_selected', () => {
    enableAllCards();
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
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 6; j++) {
            const cellElement = document.createElement('li');
            cellElement.addEventListener('click', () => {
                cardClicked(i, j, cellElement);
            });
            if (j === 5) {
                cellElement.classList.add('red-outline');
                cellElement.classList.add('shadow-card');
            } else if (j > 0) {
                cellElement.classList.add('shadow-card');
            }
            if (j === 0 && table[i]) {
                cellElement.innerHTML = `<div class="card-number">${table[i][0].card}</div><div class="card-value">${table[i][0].bullheads}</div>`;
            }
            
            tableContainer.appendChild(cellElement);
        }
    }
}

let selectedCardElement = null;

function selectCard(cardElement, card) {
    console.log('Card selected:', card);
    if (selectedCardElement) {
        console.log('A card is already selected, do nothing');
        return; // A card is already selected, do nothing
    }
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
