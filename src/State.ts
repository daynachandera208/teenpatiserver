import { type, Schema, MapSchema, ArraySchema } from '@colyseus/schema';

export class Card extends Schema {
    @type(`int32`)
    num: number;

    @type(`string`)
    suit: string;

    constructor(newNum?: number, newSuit?:string) {
        super();
        this.num = newNum;
        this.suit = newSuit;
    }
}

export class Player extends Schema {
    @type(`string`)
    id: string;
  
    @type([ Card ])
    cards: ArraySchema<Card> = new ArraySchema<Card>();

    @type([ Card ])
    bestHand: ArraySchema<Card> = new ArraySchema<Card>();

    @type(`string`)
    hand: string = undefined;

    @type(`int32`)
    blindsPerGame: number = 0;
  
    @type(`int32`)
    totalChips: number;
  
    @type(`int32`)
    currentBet: number;

    @type(`int32`)
    totalBet: number;

    @type({map: `int32`})
    cardFrequency: MapSchema<number> = new MapSchema<number>();

    @type({map: `int32`})
    suitFrequency: MapSchema<number> = new MapSchema<number>();

    @type(`boolean`)
    isBlind: boolean = true;

    @type(`boolean`)
    isRaise: boolean = false;

    @type(`boolean`)
    isDealer: boolean = false;

    @type(`int32`)
    Seatnumber :number ;

    @type(`boolean`)
    IsPack : boolean =  false;

    @type([Card])
    replacedCards : ArraySchema<Card> = new ArraySchema<Card>();

    @type(`boolean`)
    IsSS: boolean = false;

    @type(`int32`)
    newCardCount: number = 0;

    reset(){
    this.cards.splice(0,this.cards.length);
    this.bestHand.splice(0,this.bestHand.length);
    this.hand = undefined;
    this.blindsPerGame = 0;
    this.currentBet = 0;
    this.totalBet = 0;
    
    for(let key in this.cardFrequency){
        delete this.cardFrequency[key];
    }

    for(let key in this.suitFrequency){
        delete this.suitFrequency[key];
    }

    this.isBlind = true;
    this.isRaise = false;
    this.isDealer = false;
    this.IsPack = false;
    this.replacedCards.splice(0,this.replacedCards.length);
    this.IsSS = false;
    this.newCardCount = 0;
    }
    
}
  
export class GameState extends Schema {
    @type({ map: Player })
    players :  MapSchema<Player> =  new MapSchema<Player>();

    @type(`int32`)
    activePlayerIndex: number;

    @type(`int32`)
    dealerIndex: number;

    @type(`int32`)
    minBet: number;

    @type(`int32`)
    currentBet: number;

    @type(`int32`)
    currentBetBlind: number;

    @type(`int32`)
    currentBetChaal: number;

    @type([ Player ])
    winningPlayers: ArraySchema<Player> = new ArraySchema<Player>();
    
    @type(`int32`)
    pot: number = 0;
    
    @type(`boolean`)
    isGameRunning: boolean = false;
      
    @type(`string`)
    phase: string;

    @type([ Card ])
    deck: ArraySchema<Card> = new ArraySchema<Card>();

    @type({map:`string`})
    Seating: MapSchema<String> = new MapSchema<String>();

    @type(Card)
    jokerCard: Card = new Card();

    @type(`boolean`)
    IsShowPossible: boolean = false;

    reset()
    {
        for(let key in this.players){
            this.players[key].reset();
        }
        
        this.currentBet = 0;
        this.currentBetBlind = 0;
        this.currentBetChaal = 0;
        this.minBet = 0;
        this.winningPlayers.splice(0,this.winningPlayers.length);
        this.deck.splice(0,this.deck.length);
        this.pot = 0;
        this.IsShowPossible = false;

    }
}

