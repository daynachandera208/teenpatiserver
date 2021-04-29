import { Room, Client, SchemaSerializer, Delayed } from "colyseus";
import { MapSchema, ArraySchema } from "@colyseus/schema";
import { GameState, Player, Card } from "./State";
import { Var1CardUtils } from "./utils/RM_CardUtils";
import { PlayerUtils } from "./utils/PlayerUtils";
import { GameConfig } from "./GameConfig";
import { Seatingstatus } from "./Seatingstatus";
import { flattenDiagnosticMessageText } from "typescript";
import { json } from "express";

export class RoyalMarriage extends Room<GameState> {
  playerCount: number = 0;

  SeatingCount: number = 0;

  phases: string[] = [`blind`, `chaal`];

  maxPlayer: number; //Maximum Player in the room

  pokerConfig: GameConfig; //Config based on pokerType

  playerUtils: PlayerUtils; //Utilities for Players

  var1CardUtils: Var1CardUtils; //Utilities for Cards

  public delayedInterval!: Delayed;

  public delayedTimeout!: Delayed;

  sideshowPlayers: MapSchema<Player> = new MapSchema<Player>(); //players details who made side-show

  slideShowplayer: ArraySchema<Player> = new ArraySchema<Player>();

  Seatting: ArraySchema<Seatingstatus> = new ArraySchema<Seatingstatus>();

  CurrentSeattingArrange: ArraySchema<number> = new ArraySchema<number>();

  IsslideShowrun: boolean;

  //Create the Room
  onCreate(options: any) {
    for (let i = 0; i < 9; i++) {
      this.Seatting[i] = new Seatingstatus();
    }

    this.autoDispose = false;
    console.log(`Room ${this.roomName} created with roomId ${this.roomId}`);

    //Setup Helper class objects
    this.var1CardUtils = new Var1CardUtils();
    this.playerUtils = new PlayerUtils();

    //Set state
    this.setState(new GameState());

    this.pokerConfig = new GameConfig();
    this.pokerConfig.setupRoyalConfig();

    // this.maxClients = options.maxClients;
    this.maxPlayer = options.maxClients;
    this.state.minBet = this.pokerConfig.minBet;



    //Set message handlers
    this.initializeMessageHandlers();
  }

  onJoin(client: Client, options: any) {
    console.log(
      `Server: Client joined with id ${client.id} and sessionId ${client.sessionId}`
    );

    var counter: number = 0;

    // let empty : number = this.Seatting.findIndex(x => x == "-1");
    // this.Seatting[empty] = client.sessionId;

    // console.log(this.Seatting);

    //Create a new player and add to MapSchema
    let newplayer: Player = this.addPlayer(client.sessionId, client);

    //this is temperary
    // this.state.players[this.playerCount] = newplayer;
    // this.state.players[this.playerCount].Seatnumber = this.playerCount;
    // this.state.Seating[client.sessionId] = this.playerCount.toString();
    // this.SeatingCount++;
    this.state.players[client.sessionId] = newplayer;

    //    console.log( "-=-=-=-=-=-joinSeating=-=>");
    //     console.log(this.state.Seating);
    //     console.log(this.state.players);


    // console.log(this.state.players[client.sessionId]);
    //Lock the room when maxPlayers entered
    if (this.playerCount == this.maxPlayer) {
      console.log(`${this.roomId} Room Locked!!`);
      this.lock();
    }
    client.send(`Onjoin`, this.playerCount - 1);
  }

  async onLeave(client: Client, consented: boolean) {
    console.log(
      `Server: Client left with id ${client.id} and sessionId ${client.sessionId}`
    );

    this.removePlayer(client);

    if (this.clients.length < this.pokerConfig.minPlayers) {
      this.unlock();
    }
  }

  //Destroy the Room
  onDispose() {
    console.log(`${this.roomName} Room with id ${this.roomId} Disposed!!`);
  }

  initializeMessageHandlers() {
    //Message to start Game
    this.onMessage(`startGame`, (client, message) => {
      // this.startGame();
    });

    //Message that the player is SitDown on that table
    this.onMessage(`SitDown`, (client, message) => {
      console.log(client.sessionId + " " + message);

      if (this.Seatting[message].Session_id == "-1") {
        this.state.players[client.id].Seatnumber = message;
        this.state.Seating[message] = client.id;
        this.Seatting[message].Session_id = client.id;
        this.SeatingCount++;
        console.log("-=-=-=-=-SeatingCount=-=-=-=>");
        console.log(this.state.Seating);
        if (!this.state.isGameRunning)
          this.Startgame_TimerReset();
      } else {
        console.log("Seat is already taken");
      }
    });

    this.onMessage('Standup', (client, message) => {
      //this.state.players[client.sessionId].Seatnumber ;
      let find_the_index: number = this.Seatting.findIndex((x => x.Session_id == client.sessionId))
      this.Seatting[find_the_index].Session_id = "-1";
      this.Seatting[find_the_index].Is_Playing = false;
      this.state.players[client.id].Seatnumber = -1;
      delete this.state.Seating[message];
      console.log("-=-=-Standup=-=-SeatingCount=-=-=-=>");
      console.log(this.state.Seating);
      this.SeatingCount--;
      this.playerCount--;

      if (this.playerCount == 1 && this.state.isGameRunning) {
        let unpackplayer: MapSchema<Player> = new MapSchema<Player>();
        for (let i = 0; i < this.Seatting.length; i++) {
          if (this.Seatting[i].Is_Playing && this.Seatting[i].Session_id != "-1" &&
            !this.state.players[this.Seatting[i].Session_id].IsPack) {
            unpackplayer[this.Seatting[i].Session_id] = this.state.players[this.Seatting[i].Session_id];
          }
        }

        unpackplayer = this.var1CardUtils.computeHands(
          unpackplayer,
          this.pokerConfig.holeCards,
          this.playerUtils.rankByHand
        );
        this.Winning_Calcution(unpackplayer);
      }

      else if (this.playerCount == 2 && this.state.isGameRunning) {
        this.state.IsShowPossible = true;
      }
      if (find_the_index == this.state.activePlayerIndex) {
        this.check_Packed_player(this.state.activePlayerIndex);
        this.startTimer(this.state.players[this.Seatting[this.state.activePlayerIndex].Session_id]);
        this.broadcast(`nextPlayerMove`, this.state);

      }
      if (this.clients.length < this.pokerConfig.minPlayers) {
        this.unlock();
      }
    });

    this.onMessage("See", (client, message) => {
      this.state.players[client.id].isBlind = false;
      client.send("See", this.state.players[client.id]);
      this.broadcast("actions", { seat: this.state.players[client.id].Seatnumber.toString(), action: "See" });

      console.log("-=-=-=-=>" + JSON.stringify(this.state.players));

      let player = this.state.players[client.id];
      let count: number = 1;
      let next_ins: number = player.Seatnumber;
      if (!this.state.IsShowPossible) {
        if (this.state.players[client.id].Seatnumber == this.state.activePlayerIndex) {
          if (this.Check_For_SlideShow(this.state.players[client.id]) != -1) {

            console.log("this SideShow_Request");
            client.send(`Enable_SideShow`);
          }
        }
        while (count <= this.Seatting.length) {
          next_ins += 1;
          if (next_ins == 9) {
            next_ins = 0;
          }
          console.log("next_ins" + next_ins);
          if (this.Seatting[next_ins].Session_id != "-1"
            && !this.state.players[this.Seatting[next_ins].Session_id].IsPack) {
            if (!this.state.players[this.Seatting[next_ins].Session_id].isBlind) {
              if (this.state.activePlayerIndex == next_ins) {
                this.state.players[this.Seatting[this.state.activePlayerIndex].Session_id].IsSS = true;
                for (let key in this.clients) {
                  if (this.clients[key].id == this.Seatting[next_ins].Session_id) {
                    console.log("this SideShow_Request");
                    this.clients[key].send(`Enable_SideShow`);
                  }
                }
              }
            }
            break;
          }
          count++;
        }
      }
    });

    this.onMessage("extraCard", (client, message) => {
      let player = this.state.players[client.id];
      // this.state.players[this.state.Seating[client.sessionId]]
      //TODO on message recieve get card index and delete from player cards array
      let extraCard = player.cards.splice(message, 1);
      // Push extra Card to deck
      let newDeck = this.var1CardUtils.pushCard(this.state.deck, extraCard[0]);
      this.state.deck = newDeck;
      client.send("newCards", player);

      player.replacedCards = player.cards.clone();

      //Call function to check Joker card in player cards
      this.joker_Calculation(player);
      // console.log(JSON.stringify(player.cards[replaced.jokerIndex]));

      // client.send("replacingCards",player);
    });

    this.onMessage("Show", (client, message) => {
      this.broadcast("actions", { seat: this.state.players[client.id].Seatnumber.toString(), action: "Show" });

      //in show rasie is not allowed
      console.log("Pot : " + this.state.pot);
      console.log("Max Pot : " + this.pokerConfig.maxPotLimit);

      for (let i = 0; i < this.Seatting.length; i++) {
        let player = this.state.players[this.Seatting[i].Session_id];
        if (this.Seatting[i].Session_id != "-1" && player.isBlind && this.Seatting[i].Is_Playing) {

          player.cards.splice(0, 1);
          player.replacedCards = player.cards.clone();
          console.log(JSON.stringify(player.replacedCards));

          this.joker_Calculation(player);

          console.log("SHOW: " + JSON.stringify(this.state.players));
        }
      }

      if (this.state.pot >= this.pokerConfig.maxPotLimit) {
        console.log("Pot limit reached!");
        this.moveToNextPhase(`show`);
      } else {
        let player: Player = this.state.players[client.id];
        if (player.totalBet >= this.pokerConfig.maxBetLimit) {
          console.log("Bet limit reached!");
        } else {
          this.state.currentBetChaal = this.state.currentBetChaal;
          player.currentBet = this.state.currentBetChaal;
          player.totalChips -= player.currentBet;
          player.blindsPerGame = 3;
          player.isBlind = false;
          player.totalBet += player.currentBet;

          console.log(
            `Current active player current bet is ${player.currentBet}`
          );
          console.log(`Current active player total bet is ${player.totalBet}`);

          this.state.pot += player.currentBet;

          //  this.check_Packed_player(message.activePlayerIndex);

          // client.send(`message`, `${this.state.players[message.activePlayerIndex].id} played chaal`);
          console.log(`Current active player pot is ${player.totalChips}`);

          player.isRaise = false;
          console.log("-=-=-=-=-=this.state.players-=-=-=-=-=-=->");
          console.log(this.state.players);

          //Move to next step or Next Player
          if (!this.moveToNextPhase(`show`)) {
            this.startTimer(
              this.state.players[
              this.Seatting[this.state.activePlayerIndex].Session_id
              ]
            );
            this.broadcast(`nextPlayerMove`, this.state);
          }
        }
      }
    });

    //Message from client when makes a CALL
    this.onMessage(`blind`, (client, message) => {
      console.log("blind::" + JSON.stringify(this.state.players[client.id]));
      if (this.state.players[client.id].blindsPerGame === this.pokerConfig.maxBlind && this.state.players[client.id].isBlind) {
        console.log(`Please see the cards!`);
        this.state.players[client.id].isBlind = false;
        client.send("See", this.state.players[client.id])
      }
      else {
        let player: Player = this.state.players[client.id];
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

        //client.send(`message`, `${this.state.players[client.id].id} played blind`);
        console.log(`Current active player pot is ${player.totalChips}`);

        player.isRaise = false;
        //Move to next step or Next Player
      }
      this.broadcast("actions", { seat: this.state.players[client.id].Seatnumber.toString(), action: "Blind", bet: this.state.players[client.id].currentBet.toString() });
      if (this.state.pot >= this.pokerConfig.maxPotLimit) {
        console.log("Pot limit reached!");
        this.moveToNextPhase(`show`);
      }
      //Move to next step or Next Player
      else if (!this.moveToNextPhase(`next`)) {
        this.startTimer(this.state.players[this.Seatting[this.state.activePlayerIndex].Session_id]);
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
        let player: Player = this.state.players[client.id];
        if (player.totalBet >= this.pokerConfig.maxBetLimit) {
          console.log("Bet limit reached!");
        } else {
          // if (message.player.isRaise)
          if (message.isRaise) {
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

          console.log(
            `Current active player current bet is ${player.currentBet}`
          );
          console.log(`Current active player total bet is ${player.totalBet}`);

          this.state.pot += player.currentBet;

          this.check_Packed_player(message.activePlayerIndex);

          // client.send(`message`, `${this.state.players[message.activePlayerIndex].id} played chaal`);
          console.log(`Current active player pot is ${player.totalChips}`);

          player.isRaise = false;
          console.log("-=-=-=-=-=this.state.players-=-=-=-=-=-=->");
          console.log(this.state.players);

          this.broadcast("actions", { seat: this.state.players[client.id].Seatnumber.toString(), action: "Chaal", bet: this.state.players[client.id].currentBet.toString() });

          //Move to next step or Next Player
          if (this.state.pot >= this.pokerConfig.maxPotLimit) {
            console.log("Pot limit reached!");
            this.moveToNextPhase(`show`);
          }
          //Move to next step or Next Player
          else if (!this.moveToNextPhase(`next`)) {
            this.startTimer(this.state.players[this.Seatting[this.state.activePlayerIndex].Session_id]);
            this.broadcast(`nextPlayerMove`, this.state);

          }
        }
      }
    });

    this.onMessage(`pack`, (client, message) => {
      this.broadcast("actions", { seat: this.state.players[client.id].Seatnumber.toString(), action: "Packed" });

      console.log(`Player with id ${client.id} is packed` + message);

      // new code
      let client_id: string = this.Seatting[this.state.activePlayerIndex]
        .Session_id;
      this.state.players[client_id].IsPack = true;

      console.log(this.state.players[client_id].IsPack);
      this.check_Packed_player(message);
      this.playerCount--;

      //Move to next step or Next Player
      if (!this.moveToNextPhase(`next`)) {
        this.startTimer(
          this.state.players[
          this.Seatting[this.state.activePlayerIndex].Session_id
          ]
        );
        this.broadcast(`nextPlayerMove`, this.state);
      }
    });

    //Message from client when made side-show
    this.onMessage(`sideshow`, (client, message) => {

      for (let key in this.sideshowPlayers) {
        delete this.sideshowPlayers[key];
      }
      var count: number = 0;
      var perv_Seat_client: number = this.Check_For_SlideShow(this.state.players[client.id]);
      this.sideshowPlayers[client.id] = this.state.players[client.id];
      this.sideshowPlayers[this.Seatting[perv_Seat_client].Session_id] = this.state.players[this.Seatting[perv_Seat_client].Session_id];

      console.log("slideShowplayer" + JSON.stringify(this.sideshowPlayers));
      this.IsslideShowrun = true;

      let player: Player = this.state.players[client.id];

      player.currentBet = this.state.currentBetChaal;
      player.totalChips -= player.currentBet;
      player.isBlind = false;
      player.totalBet += player.currentBet;

      console.log(`Current active player current bet is ${player.currentBet}`);
      console.log(`Current active player total bet is ${player.totalBet}`);

      this.state.pot += player.currentBet;
      this.broadcast("actions", { seat: this.state.players[client.id].Seatnumber.toString(), action: "Side Show", bet: this.state.players[client.id].currentBet.toString() });

      if (this.state.pot >= this.pokerConfig.maxPotLimit) {
        console.log("Pot limit reached!");
        this.moveToNextPhase(`show`);
      }
      else {
        for (let key in this.clients) {
          if (this.clients[key].id == this.Seatting[perv_Seat_client].Session_id) {
            console.log("this SideShow_Request");
            this.clients[key].send(`SideShow_request`, true);
          }
        }
      }
    });

    this.onMessage(`SideShow_request`, (client, message) => {
      if (message) {
        this.sideshowPlayers = this.var1CardUtils.computeHands(
          this.sideshowPlayers,
          this.pokerConfig.holeCards,
          this.playerUtils.rankByHand
        );

        let winners: ArraySchema<Player> = this.playerUtils.determineWinners(
          this.sideshowPlayers
        );
        console.log("-=-=-=-winnerSideshow==-=->" + JSON.stringify(winners));
        // console.log("-=-=-=Sideshow==-=->" + JSON.stringify(this.sideshowPlayers));

        if (winners.length > 1) {
          console.log("-=-=-=-=-=-=winners.length-=-=-=-=-=-=->" + winners);
          let client_id: string = this.Seatting[this.state.activePlayerIndex].Session_id;
          this.state.players[client_id].IsPack = true;

          this.check_Packed_player(this.state.activePlayerIndex);
          console.log(this.state.players[client_id].IsPack);
          this.playerCount--;

        }
        else {
          let client_id: string = winners[0].id;
          for (var key in this.sideshowPlayers) {
            if (this.sideshowPlayers[key].id != winners[0].id) {
              console.log("-=-=-slideShowplayer=-=-=-=-=>" + this.sideshowPlayers[key].id);
              this.state.players[key].IsPack = true;
            }
          }
          // this.state.players[].IsPack = true;
          this.check_Packed_player(this.state.activePlayerIndex);
          console.log(this.state.players[client_id].IsPack);
          this.playerCount--;

        }

        this.clients.forEach(element => {
          if (this.sideshowPlayers[element.id] != null) {
            element.send("SSResult", this.sideshowPlayers);
          }
        });

        setTimeout(() => {
          if (!this.moveToNextPhase('next')) {
            this.startTimer(this.state.players[this.Seatting[this.state.activePlayerIndex].Session_id]);
            this.broadcast(`nextPlayerMove`, this.state);
          }
        }, 2000);
      } else {
        if (!this.moveToNextPhase(`next`)) {
          this.startTimer(this.state.players[this.Seatting[this.state.activePlayerIndex].Session_id]);
          this.broadcast(`nextPlayerMove`, this.state);
        }
      }
    });
  }

  startGame() {
    this.clearState();

    if (this.SeatingCount >= this.pokerConfig.minPlayers && !this.locked) {
      console.log(`${this.roomId} Room Locked!!`);
      this.lock();
    }

    if (this.SeatingCount >= this.pokerConfig.minPlayers && this.locked) {
      this.Reseting_Seating(); //this rearrange the List of CurrentSeattingArrange
      this.chooseBlinds();
      this.distributeCards(this.clients[0]);

      this.jokerCard();

      //#endregion
      for (let playerId in this.state.players) {
        let player: Player = this.state.players[playerId];
        player.currentBet = this.state.minBet;
        player.totalChips -= player.currentBet;
        player.totalBet += player.currentBet;
        this.state.pot += player.currentBet;
      }

      this.state.currentBetBlind = this.state.minBet;
      this.state.currentBetChaal = this.state.minBet * 2;

      this.state.isGameRunning = true;


      setTimeout(() => {
        this.broadcast("Distributed");
        this.broadcast("jokerCard", this.state.jokerCard);
        if (!this.moveToNextPhase(`next`)) {
          console.log("-=-=-Start game=-=-=->");
          this.startTimer(this.state.players[this.Seatting[this.state.activePlayerIndex].Session_id]);
          this.broadcast(`nextPlayerMove`, this.state);
        }
      }, 5000);
    }
  }

  //Reseting the Seating Arrangement
  Reseting_Seating() {
    this.CurrentSeattingArrange.splice(0, this.CurrentSeattingArrange.length);
    for (let i = 0; i < this.Seatting.length; i++) {
      if (this.Seatting[i].Session_id != "-1") {
        this.Seatting[i].Is_Playing = true;
        this.CurrentSeattingArrange.push(i);
      }
    }
    this.playerCount = this.CurrentSeattingArrange.length;
    console.log(
      "=-=-=-=-=-=-=this.CurrentSeattingArrange-=-=-=-=-=-=-=>" +
      this.playerCount
    );
    console.log(this.CurrentSeattingArrange);
  }

  Check_Player(): boolean {
    if (this.playerCount == 2 && !this.state.IsShowPossible) {
      this.state.IsShowPossible = true;
      return false;
    } else if (this.playerCount == 1) {
      let unpackplayer: MapSchema<Player> = new MapSchema<Player>();
      for (let i = 0; i < this.Seatting.length; i++) {
        if(this.Seatting[i].Session_id == '-1') continue;

        console.log("Seating:::::::" + this.Seatting[i]);

        if (this.Seatting[i].Is_Playing && !this.state.players[this.Seatting[i].Session_id].IsPack)
            unpackplayer[this.Seatting[i].Session_id] = this.state.players[this.Seatting[i].Session_id];
    }
      
      // for (let key in this.state.players) {
      //   if (!this.state.players[key].IsPack && this.Seatting[this.state.players[key].Seatnumber].Is_Playing)
      //     unpackplayer[key] = this.state.players[key];
      // }
      console.log(unpackplayer);

      if (
        !this.state.players[
          this.Seatting[this.state.activePlayerIndex].Session_id
        ].isBlind
      ) {
        unpackplayer = this.var1CardUtils.computeHands(
          unpackplayer,
          this.pokerConfig.holeCards,
          this.playerUtils.rankByHand
        );
      }

      this.Winning_Calcution(unpackplayer);
      return true;
    }
    return false;
  }

  //Distribute Cards
  distributeCards(client: Client) {
    this.state.deck = this.var1CardUtils.getDeck();
    for (let i = 0; i < this.pokerConfig.holeCards; i++) {
      for (let playerId in this.state.players) {
        let player: Player = this.state.players[playerId];
        let res = this.var1CardUtils.popCards(this.state.deck, 1);
        this.state.deck = res.deck;

        // res.chosenCards[0].isHole = true;
        player.cards.push(res.chosenCards[0]);

        if (player.cards.length === this.pokerConfig.holeCards) {
          player.replacedCards = player.cards.clone();
          //client.send('myinfo', player.cards);
        }
      }
    }
    this.state.minBet = this.pokerConfig.minBet;
    this.state.currentBet = this.pokerConfig.minBet;
  }

  //#region
  jokerCard() {
    //Shuffle available cards in deck
    // this.state.deck = this.var1CardUtils.getDeck();
    //select available cards from deck
    let jokerCard = this.var1CardUtils.popCards(this.state.deck, 1);
    this.state.deck = jokerCard.deck;
    this.state.jokerCard = jokerCard.chosenCards[0];
    console.log(jokerCard.chosenCards[0].toJSON());
    //Broadcast selected card to all players
  }
  //#endregion

  // this will call the and find the folded player
  check_Packed_player(message) {
    var flag: boolean = true;
    var count: number = 0;

    // console.log(
    //   "-=-=check_Packed_player activePlayerIndex-=->" +
    //   this.state.activePlayerIndex +
    //   this.state.players[
    //     this.Seatting[this.state.activePlayerIndex].Session_id
    //   ].IsPack
    // );

    while (count <= this.Seatting.length) {
      this.state.activePlayerIndex =
        (message + 1 + count) % this.Seatting.length;

      let client_id: Seatingstatus = this.Seatting[
        this.state.activePlayerIndex
      ];

      if (
        client_id.Is_Playing &&
        !this.state.players[client_id.Session_id].IsPack
      ) {
        console.log(
          "-=-=check_Packed_player-=-> " +
          this.state.players[client_id.Session_id].blindsPerGame
        );
        console.log(
          this.state.players[client_id.Session_id].IsPack +
          " " +
          this.state.players[client_id.Session_id].id
        );
        if (this.state.players[client_id.Session_id].blindsPerGame == 3 && this.state.players[client_id.Session_id].isBlind) {
          this.state.players[client_id.Session_id].isBlind = false;
          this.clients.forEach((element) => {
            if (element.id == client_id.Session_id) {
              console.log(
                "-=-=check_Packed_player-=-> " +
                this.state.players[client_id.Session_id].blindsPerGame
              );
              element.send("See", this.state.players[client_id.Session_id]);
            }
          });
        }
        break;
      }
      count++;
    }
  }

  clearState() {
    this.state.reset();
  }

  //Choose Small & Big Blinds
  chooseBlinds() {
    var selected_index: number = this.playerUtils.getRandomPlayer(
      this.playerCount
    );
    var selected_seat: number = this.CurrentSeattingArrange[selected_index];

    this.state.dealerIndex = selected_seat;
    console.log(
      "-=-=-=-Seating-==-=-=-=-=-=->" +
      selected_seat +
      " " +
      this.state.Seating[selected_seat.toString()]
    );
    console.log(this.state.Seating);

    //this will set the dealer
    this.state.players[
      this.state.Seating[selected_seat.toString()]
    ].isDealer = true;

    //arranging the first player how will play
    var first_player: number = (selected_index + 1) % this.playerCount;
    this.state.activePlayerIndex = this.CurrentSeattingArrange[first_player];
    console.log(
      "-=-=-=-=dealerIndex-=-=-=>" +
      this.state.dealerIndex +
      " " +
      this.playerCount
    );
  }

  //adds a new player to the Room
  addPlayer(sessionId: string, client: Client): Player {
    let newPlayer: Player = new Player();
    newPlayer.id = sessionId;
    newPlayer.totalChips = 80000;
    newPlayer.currentBet = 0;
    newPlayer.totalBet = 0;
    newPlayer.Seatnumber = -1;
    console.log(`New Player ${newPlayer.id} added Successfully!!`);
    return newPlayer;
  }

  startTimer(player: Player) {

    console.log("-=-=-starttimer=-=->");
    this.clock.clear();
    this.clock.start();

    this.delayedInterval = this.clock.setInterval(() => {
      this.broadcast("currentTimer", {
        timer: this.clock.elapsedTime / 1000,
        id: player.id,
      });
      console.log("Time now " + this.clock.elapsedTime / 1000);
    }, 1000);
    console.log("-=-=-=-=>")
    console.log("this.delayedInterval.pause" + this.delayedInterval.active);

    // After 10 seconds clear the timeout;
    // this will *stop and destroy* the timeout completely
    this.delayedTimeout = this.clock.setTimeout(() => {
      console.log("-=-=-starttimerdelayedTimeout=-=->");
      if (!this.IsslideShowrun) {

        let client_id: string = this.Seatting[this.state.activePlayerIndex].Session_id;
        this.state.players[client_id].IsPack = true;

        this.check_Packed_player(this.state.activePlayerIndex);
        console.log(this.state.players[client_id].IsPack);
        this.playerCount--;
      }
      else {
        // this.
        let per_inves = this.Check_For_SlideShow(player);
        console.log("=-=-=-=per_inves-=-=->" + per_inves);
        for (let i = 0; i < this.clients.length; i++) {
          if (this.clients[i].sessionId == this.Seatting[per_inves].Session_id) {
            this.clients[i].send(`SideShow_request`, false);
          }
        }
        this.check_Packed_player(this.state.activePlayerIndex);
        this.IsslideShowrun = false;
      }

      this.delayedInterval.clear();
      this.delayedInterval.reset();

      //Move to next step or Next Player
      if (!this.moveToNextPhase(`next`)) {
        this.startTimer(this.state.players[this.Seatting[this.state.activePlayerIndex].Session_id]);
        this.broadcast(`nextPlayerMove`, this.state);
      }

    }, 16_000);
  }

  //removes a player from the Room
  removePlayer(client: Client) {
    let find_the_index: number = this.Seatting.findIndex((x => x.Session_id == client.sessionId))
    this.Seatting[find_the_index].Session_id = "-1";
    this.Seatting[find_the_index].Is_Playing = false;
    this.state.players[client.id].Seatnumber = -1;
    delete this.state.Seating[find_the_index];
    console.log("-=-=-Standup=-=-SeatingCount=-=-=-=>");
    console.log(this.state.Seating);
    this.SeatingCount--;
    this.playerCount--;



    if (this.playerCount == 1 && this.state.isGameRunning) {
      let unpackplayer: MapSchema<Player> = new MapSchema<Player>();
      for (let i = 0; i < this.Seatting.length; i++) {
        if (this.Seatting[i].Is_Playing && this.Seatting[i].Session_id != "-1" &&
          !this.state.players[this.Seatting[i].Session_id].IsPack) {
          unpackplayer[this.Seatting[i].Session_id] = this.state.players[this.Seatting[i].Session_id];
          let player = unpackplayer[this.Seatting[i].Session_id];
          if (player.isBlind) {
            player.cards.splice(0, 1);
          }
          player.replacedCards = player.cards.clone();
          console.log(JSON.stringify(player.replacedCards));
          this.joker_Calculation(player);
        }
      }

      console.log(unpackplayer);
      unpackplayer = this.var1CardUtils.computeHands(
        unpackplayer,
        this.pokerConfig.holeCards,
        this.playerUtils.rankByHand
      );
      this.Winning_Calcution(unpackplayer);
      this.clock.clear();
    }
    else {
      if (this.playerCount == 2 && this.state.isGameRunning) {
        this.state.IsShowPossible = true;
      }
      console.log("-=-=-Start game=-=-=->" + find_the_index + " " + this.state.activePlayerIndex);
      if (find_the_index == this.state.activePlayerIndex) {
        this.check_Packed_player(this.state.activePlayerIndex);
        console.log("-=-=-Start game=-=-=->" + this.state.activePlayerIndex);
        if (!this.moveToNextPhase(`next`)) {
          this.startTimer(this.state.players[this.Seatting[this.state.activePlayerIndex].Session_id]);
          this.broadcast(`nextPlayerMove`, this.state);
        }
      }
    }
    console.log(`${client.sessionId} Player removed!!`);
    delete this.state.players[client.sessionId];
  }

  //Start Game timer will reset the whole timer
  Startgame_TimerReset() {
    if (this.SeatingCount >= this.pokerConfig.minPlayers) {
      this.clock.clear();
      setTimeout(() => {
        this.clock.start();
        this.delayedInterval = this.clock.setInterval(() => {
          this.broadcast("timer", Math.floor(this.clock.elapsedTime / 1000));
          console.log("'Starting game!");
        }, 1000);
        this.clock.setTimeout(() => {
          console.log("this.clock.setTimeout-=-=>");

          this.delayedInterval.clear();
          this.clearState();
          this.startGame();
        }, 6_000);
      }, 2_000);

    }
  }

  joker_Calculation(player: Player) {
    let replaced = this.var1CardUtils.checkJokerCards(
      player,
      this.state.jokerCard,
      this.state.deck
    );
    console.log(JSON.stringify(replaced.rC));

    if (replaced.rC != null) {
      if (replaced.rC.length == 1) {
        player.replacedCards[replaced.jokerIndex] = replaced.rC[0];
      }
      else if (replaced.rC.length == 2) {
        player.replacedCards[replaced.jokerIndex1] = replaced.rC[0];
        player.replacedCards[replaced.jokerIndex2] = replaced.rC[1];
      }
      else {
        player.replacedCards = replaced.rC;
      }
    }

    let cardHand = this.var1CardUtils.computeHandsForCards(player, 3, player.cards, this.playerUtils.rankByHand);
    let replaceCardHand = this.var1CardUtils.computeHandsForCards(player, 3, player.replacedCards, this.playerUtils.rankByHand);

    if (this.playerUtils.rankByHand.indexOf(cardHand) > this.playerUtils.rankByHand.indexOf(replaceCardHand)) {
      player.hand = replaceCardHand;
    }
    else {
      player.replacedCards = player.cards.clone();
      player.hand = cardHand;
    }

    console.log(JSON.stringify(player.cards));
    console.log(JSON.stringify(player.replacedCards));
    this.state.deck = replaced.nD;
  }

  //This Calculate the winner for the player and send the message
  Winning_Calcution(player: MapSchema<Player>) {
    let winners: ArraySchema<Player> = this.playerUtils.determineWinners(
      player
    );
    winners.forEach((player) => {
      this.state.winningPlayers.push(player);
    });

    console.log("Send broadcast" + JSON.stringify(this.state.winningPlayers));
    this.state.isGameRunning = false;

    if (winners.length > 1) {

      if (this.state.pot >= this.pokerConfig.maxPotLimit) {
        this.state.winningPlayers.forEach(value => {
          let winningprice = this.state.pot / this.state.winningPlayers.length
          console.log("-=-=-=-winningprice=-=-=-=-=-=>");
          console.log(winningprice + " " + typeof (winningprice));
          console.log(this.state.players[value.id].totalChips);
          value.totalChips += winningprice;
          console.log(this.state.players[value.id].totalChips);
        });
      }
      else {
        this.state.winningPlayers.forEach(value => {
          if (value.id != this.Seatting[this.state.activePlayerIndex].Session_id) {
            let winningprice = this.state.pot;
            console.log("-=-=-=-winningprice=-=-=-=-=-=>");
            console.log(winningprice + " " + typeof (winningprice));
            console.log(this.state.players[value.id].totalChips);
            value.totalChips += winningprice;
            console.log(this.state.players[value.id].totalChips);
          }
          else {
            delete this.state.winningPlayers[value.id];
          }
        });
      }
    }
    else {
      this.state.winningPlayers.forEach(value => {
        let winningprice = this.state.pot / this.state.winningPlayers.length
        console.log("-=-=-=-winningprice=-=-=-=-=-=>");
        console.log(winningprice + " " + typeof (winningprice));
        console.log(this.state.players[value.id].totalChips);
        value.totalChips += winningprice;
        console.log(this.state.players[value.id].totalChips);
      });
    }

    //the person who will give the show and the cards of both players are same that
    //than the person who give show will lose
    this.broadcast(`winning`, this.state);
  }

  //This Will find the there is any Player to Do slideShow
  Check_For_SlideShow(player: Player): number {
    console.log(player.IsSS + player.id);
    let count: number = 1;
    let perv_ins: number = player.Seatnumber;
    if (!this.state.IsShowPossible) {
      while (count <= this.Seatting.length) {
        perv_ins -= 1;
        if (perv_ins == -1) {
          perv_ins = 8;
        }
        console.log("perv_ins" + perv_ins);
        if (this.Seatting[perv_ins].Session_id != "-1"
          && !this.state.players[this.Seatting[perv_ins].Session_id].IsPack) {
          if (!this.state.players[this.Seatting[perv_ins].Session_id].isBlind) {
            player.IsSS = true;
            return perv_ins;
          }
          else {
            player.IsSS = false;
            return -1;
          }
        }
        count++;
      }
    }
    else {
      player.IsSS = false;
      return -1;
    }
  }

  //Move to next phase if all players bets are equal else return false to move to next player
  moveToNextPhase(phase: string): boolean {
    let client_id: string = this.Seatting[this.state.activePlayerIndex]
      .Session_id;
    console.log("moveToNextPhase" + client_id);
    this.state.players[client_id].currentBet = this.state.minBet;

    if (this.Check_Player()) {
      this.state.isGameRunning = false;
      this.Startgame_TimerReset();
      return true;
    }

    if (
      this.state.players[client_id].currentBet === this.state.currentBet &&
      phase !== `show`
    ) {
      this.state.currentBet = this.state.minBet;

      //This will call when the slide show
      if (phase === `ss`) {
        console.log(`SIDE SHOW`);

        this.sideshowPlayers = this.var1CardUtils.computeHands(
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
              if (
                this.state.players[playerId].id === this.sideshowPlayers[i].id
              ) {
                console.log(`${this.state.players[playerId].id} is packed!`);
                delete this.state.players[playerId];
                this.playerCount--;
                this.state.activePlayerIndex = this.state.activePlayerIndex + 1;
              }
            }
          }
        }
        this.sideshowPlayers = new MapSchema<Player>();
        return true;
      }
      console.log("Next Current Bet : " + this.state.currentBet);
      console.log(`The previous Phase blind has pot ${this.state.pot}`);
      this.broadcast(`nextPlayerMove`, this.state);
    }

    //When river then compute Hands because its SHOWDOWN time
    if (phase === `show`) {
      this.state.isGameRunning = false;
      console.log(`SHOW DOWN TIME, COMPUTE THE HANDS`);


      //This will store the upack player in the list
      let unpackplayer: MapSchema<Player> = new MapSchema<Player>();

      for (let key in this.state.players) {
        if (this.Seatting[this.state.players[key].Seatnumber].Is_Playing && !this.state.players[key].IsPack && this.state.players[key].Seatnumber != -1)
          unpackplayer[key] = this.state.players[key];
      }

      unpackplayer = this.var1CardUtils.computeHands(
        unpackplayer,
        this.pokerConfig.holeCards,
        this.playerUtils.rankByHand
      );


      this.Winning_Calcution(unpackplayer);
      this.Startgame_TimerReset();
      return true;
    }

    this.Check_For_SlideShow(this.state.players[client_id]);
    return false;
  }
}
