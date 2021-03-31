//Class to maintain all configuration related details per pokerType
export class GameConfig {
    minPlayers: number = undefined;

    holeCards: number = undefined;

    holeCardsToBeUsed: number = undefined;

    maxBlind: number = undefined;

    maxBetLimit: number = undefined;

    maxPotLimit: number = undefined;

    minBet: number = undefined;

    betDoubleInRound: string = undefined;

    setupConfig() {
        this.minPlayers = 3;
        this.holeCards = 3;
        this.maxBlind = 3;
        this.minBet = 50;
        this.maxPotLimit = 1000;
        this.maxBetLimit = 1000;
    }
}