import { Room, Client, SchemaSerializer, Delayed } from 'colyseus';
import { MapSchema, ArraySchema } from '@colyseus/schema';
import { GameState, Player, Card } from './State';
import { CardUtils } from './utils/CardUtils';
import { PlayerUtils } from './utils/PlayerUtils';
import { GameConfig } from './GameConfig';
import { flattenDiagnosticMessageText } from 'typescript';

export class GameRoom extends Room<GameState> {
    playerCount: number = 0; //Tracks the number of players in the room

    SeatingCount: number = 0;

    phases: string[] = [`blind`, `chaal`];

    maxPlayer: number; //Maximum Player in the room

    player: MapSchema<Player> = new MapSchema<Player>();
    // blindMade: boolean = true; //Track and limit the Raise made in a phase to the config value

    pokerConfig: GameConfig; //Config based on pokerType

    playerUtils: PlayerUtils; //Utilities for Players

    cardUtils: CardUtils; //Utilities for Cards

    public delayedInterval!: Delayed;

    sideshowPlayers: MapSchema<Player> = new MapSchema<Player>(); //players details who made side-show

    Seatting: ArraySchema<string>  = new ArraySchema<string>();
    //Create the Room
    onCreate(options: any) {
        // console.log("Hi");
        for (let i = 0; i < 9; i++) {
            this.Seatting[i]= "-1";
        }

        console.log(`Room ${this.roomName} created with roomId ${this.roomId}`);

        //Setup Helper class objects
        this.cardUtils = new CardUtils();
        this.playerUtils = new PlayerUtils();

        //Set state
        this.setState(new GameState());

        this.pokerConfig = new GameConfig();
        this.pokerConfig.setupConfig();
        
        // this.maxClients = options.maxClients;
        this.maxPlayer = options.maxClients;
        
        //

        //Set message handlers
        this.initializeMessageHandlers();
    }

    //New Player Joins the Room
    onJoin(client: Client, options: any) {
        console.log(
            `Server: Client joined with id ${client.id} and sessionId ${client.sessionId}`
        );

        var counter : number = 0;

        let empty : number = this.Seatting.findIndex(x => x == "-1");
        this.Seatting[empty] = client.sessionId; 
        
        console.log(this.Seatting);
         
        //Create a new player and add to MapSchema
        let newplayer: Player = this.addPlayer(client.sessionId, client);

        //this is temperary
            this.state.players[this.playerCount] = newplayer;
            this.state.players[this.playerCount].Seatnumber = this.playerCount;
            this.state.Seating[client.sessionId] = this.playerCount.toString();
            this.SeatingCount++;
        
        //this is temperary 2
            // this.state.players[empty] = newplayer;
            // this.state.players[empty].Seatnumber = empty;
            // this.state.Seating[client.sessionId] = empty.toString();
            // this.SeatingCount++;
        

        console.log("-=-=-=-=-=-joinSeating=-=>");
        console.log(this.state.Seating);
        console.log(this.state.players);

        this.playerCount++;

        // console.log(this.state.players[client.sessionId]);
        //Lock the room when maxPlayers entered
        if (this.playerCount == this.maxPlayer) {
            console.log(`${this.roomId} Room Locked!!`);
            this.lock();
        }
        client.send(`Onjoin`, this.playerCount - 1);

    }

    //Existing Player Leaves the Room
    async onLeave(client: Client, consented: boolean) {
        console.log(
            `Server: Client left with id ${client.id} and sessionId ${client.sessionId}`
        );

        try {
            //If consented, remove without wait
            //if (consented) {
            this.removePlayer(client);
            
            let currSeat : number = this.Seatting.findIndex(x => x == client.sessionId);
            this.Seatting[currSeat] = "-1";

            let teampseating = this.state.Seating[client.sessionId];

            delete this.state.players[teampseating];
            delete this.state.Seating[client.sessionId];


            console.log("-=-=-=-=-=-LeaveSeating=-=>" + teampseating);
            console.log(this.state.Seating);
            console.log(this.state.players);

            // }

            //Wait for reconnection on connection lost
            // await this.allowReconnection(client, 20);
            // console.log(
            //     `Client with id ${client.id} successfully reconnected!!`
            // );
        } catch (e) {
            console.log(`Player has not reconnected, removing from Room`);
            this.removePlayer(client);
        }
    }

    //Destroy the Room
    onDispose() {
        console.log(`${this.roomName} Room with id ${this.roomId} Disposed!!`);
    }

    //Initialize all the message handler to be handled from Client
    initializeMessageHandlers() {

        //Message to start Game
        this.onMessage(`startGame`, (client, message) => {
            this.startGame();
        });

        //Message that the player is SitDown on that table
        this.onMessage(`SitDown`, (client, message) => {
            console.log(client.sessionId + " " + message);
            
            this.state.players[message].Seatnumber = message;
            this.state.Seating[message] = client.sessionId;
            this.Seatting[message] = client.sessionId;
            console.log(this.state.Seating);
            this.SeatingCount++;

        });

        this.onMessage('Standup', (client, message) => {
            //this.state.players[client.sessionId].Seatnumber ;
            let find_the_index:number= this.Seatting.findIndex((x => x==client.sessionId))
            this.Seatting[find_the_index] = "-1";
            delete this.state.Seating[client.sessionId];
            console.log(this.state.Seating);
            this.SeatingCount--;
        });

        this.onMessage("See", (client, message) => {
            this.state.players[this.state.Seating[client.sessionId]]
            this.state.players[this.state.Seating[client.sessionId]].isBlind = false;
            client.send("See", this.state.players[this.state.Seating[client.sessionId]])

        });

        //Message from client when makes a CALL
        this.onMessage(`blind`, (client, message) => {
            if (this.state.players[this.state.activePlayerIndex].blindsPerGame === this.pokerConfig.maxBlind) {
                console.log(`Please see the cards!`);
            }
            else {
                let player: Player = this.state.players[message.activePlayerIndex];
                // if (message.player.isRaise) {
                if (message.isRaise) {
                    this.state.currentBetBlind = this.state.currentBetBlind * 2;
                    this.state.currentBetChaal = this.state.currentBetBlind * 2;
                } else {
                    this.state.currentBetBlind = this.state.currentBetBlind;
                }

                player.currentBet = this.state.currentBetBlind;
                player.totalChips -= player.currentBet;
                player.blindsPerGame = player.blindsPerGame + 1;
                player.totalBet += player.currentBet;

                console.log(`Current active player current bet is ${player.currentBet}`);
                console.log(`Current active player total bet is ${player.totalBet}`);

                this.state.pot += player.currentBet;

                this.check_Packed_player(message.activePlayerIndex);

                client.send(`message`, `${this.state.players[message.activePlayerIndex].id} played blind`);
                console.log(`Current active player pot is ${player.totalChips}`);

                player.isRaise = false;
                //Move to next step or Next Player
                if (!this.moveToNextPhase(`next`))
                    this.broadcast(`nextPlayerMove`, this.state);
            }
        });

        this.onMessage(`chaal`, (client, message) => {
            console.log("Pot : " + this.state.pot);
            console.log("Max Pot : " + this.pokerConfig.maxPotLimit);
            if (this.state.pot >= this.pokerConfig.maxPotLimit) {
                console.log("Pot limit reached!");
                this.moveToNextPhase(`show`);
            } else {
                let player: Player = this.state.players[message.activePlayerIndex];
                if (player.totalBet >= this.pokerConfig.maxBetLimit) {
                    console.log("Bet limit reached!");
                } else {
                    // if (message.player.isRaise) 
                    if(message.isRaise)
                    {
                        this.state.currentBetChaal = this.state.currentBetChaal * 2;
                        this.state.currentBetBlind = this.state.currentBetChaal / 2;
                    } else {
                        this.state.currentBetChaal = this.state.currentBetChaal;
                    }

                    player.currentBet = this.state.currentBetChaal;
                    player.totalChips -= player.currentBet;
                    player.blindsPerGame = 3;
                    player.isBlind = false;
                    player.totalBet += player.currentBet;

                    console.log(`Current active player current bet is ${player.currentBet}`);
                    console.log(`Current active player total bet is ${player.totalBet}`);

                    this.state.pot += player.currentBet;

                    this.check_Packed_player(message.activePlayerIndex);

                    client.send(`message`, `${this.state.players[message.activePlayerIndex].id} played chaal`);
                    console.log(`Current active player pot is ${player.totalChips}`);

                    player.isRaise = false;
                    console.log("-=-=-=-=-=this.state.players-=-=-=-=-=-=->");
                    console.log(this.state.players);
                    
                    //Move to next step or Next Player
                    if (!this.moveToNextPhase(`next`))
                        this.broadcast(`nextPlayerMove`, this.state);
                }
            }
        });

        this.onMessage(`pack`, (client, message) => {
           console.log(`Player with id ${client.id} is packed` + message);
           // old code
           // delete this.state.players[message.activePlayerIndex];
           // this.state.activePlayerIndex =
           //     (message.activePlayerIndex + 1) % this.playerCount;
           // this.playerCount--;
           //  this.state.activePlayerIndex =
           //  ((message + 1) % this.playerCount);
            
            
           // new code
            this.state.players[this.state.activePlayerIndex].IsPack = true;
            console.log(this.state.players[message.toString()].IsPack);
            this.check_Packed_player(message);

            //Move to next step or Next Player
            if (!this.moveToNextPhase(`next`))
                this.broadcast(`nextPlayerMove`, this.state);
        });

        //Message from client when made side-show
        this.onMessage(`sideshow`, (client, message) => {
            console.log(message.activePlayerIndex + ' / ' + this.state.activePlayerIndex);

            if ((message.activePlayerIndex - 1) < 0) {
                var prev = this.maxPlayer - 1;
                if (prev === undefined) {
                    prev = this.maxPlayer - 2;
                }
            } else {
                var prev = message.activePlayerIndex - 1;
                if (prev === undefined) {
                    prev = message.activePlayerIndex - 2;
                }
            }
            console.log(`Player with id ${message.player.id} made Side Show! to ${this.state.players[prev].id}`);

            this.sideshowPlayers[message.player.id] = this.state.players[message.activePlayerIndex];
            this.sideshowPlayers[this.state.players[prev].id] = this.state.players[prev];

            //Move to next step or Next Player
            if (!this.moveToNextPhase(`ss`))
                this.broadcast(`nextPlayerMove`, this.state);
        });
    }

    startGame() {
        if (this.playerCount >= this.pokerConfig.minPlayers && !this.locked) {
            console.log(`${this.roomId} Room Locked!!`);
            this.lock();
        }

        if (this.playerCount >= this.pokerConfig.minPlayers && this.locked) {

            this.chooseBlinds();
            this.distributeCards(this.clients[0]);

            for (let playerId in this.state.players) {
                let player: Player = this.state.players[playerId];
                player.currentBet = this.state.minBet;
                player.totalChips -= player.currentBet;
                player.totalBet += player.currentBet;
                this.state.pot += player.currentBet;
            };

            this.state.currentBetBlind = this.state.minBet;
            this.state.currentBetChaal = this.state.minBet * 2;

            this.state.isGameRunning = true;

            if (!this.moveToNextPhase(`next`)) {
                this.broadcast(`nextPlayerMove`, this.state);
                
            }
            ;
        }
    }

    //adds a new player to the Room
    addPlayer(sessionId: string, client: Client): Player {
        let newPlayer: Player = new Player();
        newPlayer.id = sessionId;
        newPlayer.totalChips = 80000;
        newPlayer.currentBet = 0;
        newPlayer.totalBet = 0;
        console.log(`New Player ${newPlayer.id} added Successfully!!`);
        this.player[sessionId] = newPlayer;
        return newPlayer;
    }

    //this is the timer for the player move
    startTimer(player: Player) {
        this.clock.start();
    
        this.delayedInterval = this.clock.setInterval(() => {
          this.broadcast("currentTimer", {
            timer: this.clock.elapsedTime / 1000,
            id: player.id,
          });
          console.log("Time now " + this.clock.elapsedTime / 1000);
        }, 1000);
    
        // After 10 seconds clear the timeout;
        // this will *stop and destroy* the timeout completely
        this.clock.setTimeout(() => {
            this.state.players[this.state.activePlayerIndex].IsPack = true;
           // console.log(this.state.players[message.toString()].IsPack);
            this.check_Packed_player(this.state.activePlayerIndex);

            //Move to next step or Next Player
            if (!this.moveToNextPhase(`next`))
                this.broadcast(`nextPlayerMove`, this.state);
          this.delayedInterval.clear();
        }, 16_000);
      }



    //removes a player from the Room
    removePlayer(client: Client) {
        delete this.state.players[client.sessionId];
        this.playerCount--;
        console.log(`${client.sessionId} Player removed!!`);
    }

    // this will call the and find the folded player
    check_Packed_player(message) 
    {
        var flag:boolean = true;
        var count:number = 0;
         
        console.log("-=-=check_Packed_player activePlayerIndex-=->"
         + this.state.activePlayerIndex +
          this.state.players[this.state.activePlayerIndex].IsPack);
        
          while(count<=this.playerCount)
        {
            this.state.activePlayerIndex =
            ((message + 1 + count) % this.playerCount);
            
            count++;
            console.log("count"+count);
            console.log("this.state.players[this.state.activePlayerIndex].IsPack"+
            this.state.players[this.state.activePlayerIndex].IsPack +" "+this.state.activePlayerIndex+" "+ this.playerCount);

            if(!this.state.players[this.state.activePlayerIndex].IsPack)
            {
                console.log("-=-=check_Packed_player-=->");
                console.log(this.state.players[this.state.activePlayerIndex].IsPack + " " +this.state.players[this.state.activePlayerIndex].id);
                break;
            }
        }
    }

    clearState() {
        this.state.reset();
    }

    //distributes Cards to all players
    distributeCards(client: Client) {
        this.state.deck = this.cardUtils.getDeck();
        for (let i = 0; i < this.pokerConfig.holeCards; i++) {
            for (let playerId in this.state.players) {
                let player: Player = this.state.players[playerId];
                let res = this.cardUtils.popCards(this.state.deck, 1);
                this.state.deck = res.deck;

                // res.chosenCards[0].isHole = true;
                player.cards.push(res.chosenCards[0]);

                if (player.cards.length === this.pokerConfig.holeCards) {
                    client.send('myinfo', player.cards);
                }
            }
        }
        this.state.minBet = this.pokerConfig.minBet;
        this.state.currentBet = this.pokerConfig.minBet;
    }

    //Choose Small & Big Blinds
    chooseBlinds() {
        this.state.dealerIndex = this.playerUtils.getRandomPlayer(
            this.playerCount
        );
        this.state.players[this.state.dealerIndex].isDealer = true;
        console.log("-=-=-=-=dealerIndex-=-=-=>" + this.state.dealerIndex + " " + this.playerCount);
        this.state.activePlayerIndex = (this.state.dealerIndex + 1) % this.playerCount;
    }

    //Move to next phase if all players bets are equal else return false to move to next player
    moveToNextPhase(phase: string): boolean {
        //this.startTimer(this.state.players[this.state.activePlayerIndex])
        // if (this.state.players[this.state.activePlayerIndex] === undefined) {
        //     this.state.activePlayerIndex = this.state.activePlayerIndex + 1;
        // }
    
        this.state.players[this.state.activePlayerIndex].currentBet = this.state.minBet;

        if (this.state.players[this.state.activePlayerIndex].currentBet === this.state.currentBet && phase !== `show`) {
            this.state.currentBet = this.state.minBet;
            
            //This will call when the slide show 
            if (phase === `ss`) 
            {
                console.log(`SIDE SHOW`);
        
                this.sideshowPlayers = this.cardUtils.computeHands(
                    this.sideshowPlayers,
                    this.pokerConfig.holeCards,
                    this.playerUtils.rankByHand
                );

                let winners: ArraySchema<Player> = this.playerUtils.determineWinners(
                    this.sideshowPlayers
                );

                for (const i in this.sideshowPlayers) {
                    if (i != winners[0].id) {
                        for (const playerId in this.state.players) {                            
                            if (this.state.players[playerId].id === this.sideshowPlayers[i].id) {
                                console.log(`${this.state.players[playerId].id} is packed!`);
                                delete this.state.players[playerId];
                                this.playerCount--;
                                this.state.activePlayerIndex = this.state.activePlayerIndex + 1;
                            } 
                        }
                    }
                } 
                
                this.sideshowPlayers = new MapSchema<Player>();
            } 
            // console.log("Next Current Bet : "+this.state.currentBet);
            console.log(
                `The previous Phase blind has pot ${this.state.pot}`
            );
            this.broadcast(`nextPlayerMove`, this.state);
            return true;

        }

        //When river then compute Hands because its SHOWDOWN time
        if (phase === `show`) {
            console.log(`SHOW DOWN TIME, COMPUTE THE HANDS`);
            this.state.players = this.cardUtils.computeHands(
                this.state.players,
                this.pokerConfig.holeCards,
                this.playerUtils.rankByHand
            );

            let winners: ArraySchema<Player> = this.playerUtils.determineWinners(
                this.state.players
            );
            winners.forEach((player) => {
                this.state.winningPlayers.push(player);
            });

            console.log("Send broadcast");
            this.state.isGameRunning = false;
            
            this.state.winningPlayers.forEach(value =>
                {
                    let winningprice=this.state.pot/this.state.winningPlayers.length
                    value.totalChips +=winningprice;
                });
                
            this.broadcast(`winning`, this.state.winningPlayers);
            
            
            setTimeout(() => {
                // this.broadcast("")
                this.clock.start();
                this.delayedInterval = this.clock.setInterval(() => {
                    this.broadcast("timer","Starting newgame in: "+ Math.floor(this.clock.elapsedTime/1000));
                     console.log("'Starting game!");
                 }, 1000);
            }, 5_000);
            
            // this.delayedInterval = this.clock.setInterval(() => {
            //    // this.broadcast("")
            //     console.log("'Starting game!");
            // }, 1000);

            this.clock.setTimeout(() => {
                console.log("this.clock.setTimeout-=-=>");
                
                this.clearState();
                this.startGame();
                this.delayedInterval.clear();
            }, 12_000);

            return true;
        }

        return false;
    }
}
