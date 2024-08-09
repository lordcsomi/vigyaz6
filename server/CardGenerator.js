class CardGenerator {
    static generateCards() {
        const cards = [];
        for (let i = 1; i <= 104; i++) {
            let bullheads = 1;
            if (i % 10 === 5) bullheads += 1;
            if (i % 10 === 0) bullheads += 2;
            if (i % 11 === 0) bullheads += 4;
            if (i === 55) bullheads = 7;
            cards.push({ card: i, bullheads });
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

module.exports = CardGenerator;
