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

socket.on('gameStart', ({ hands, table }) => {
    document.getElementById('waitingMessageContainer').style.display = 'none';
    console.log('Game started');
    console.log('Hands:', hands);
    console.log('Table:', table);
});

function updatePlayerCount(players) {
    document.getElementById('playerCount').textContent = `${players.length}/4 players`;
}
