import { Player } from "../State";
import { MapSchema, ArraySchema } from '@colyseus/schema';

//Utility class for Cards
export class PlayerUtils {
  rankByHand = [
    `Trail`,
    `PureSequence`,
    `Sequence`,
    `Color`,
    `Pair`,
    `HighCard`
  ];

  getRandomPlayer(totalPlayers: number) : number {
    let randomPlayer = Math.random() * Math.floor(totalPlayers);
    return Math.floor(randomPlayer);
  }

  determineWinners(players: MapSchema<Player>) : ArraySchema<Player> {
    let winningPlayers: string[] = [];
    let winningHand: number = -1;
    for(let key in players) {
      console.log(`Player id ${players[key].id} and hand ${players[key].hand}`);
      if(winningHand === -1) {
        winningHand = this.rankByHand.indexOf(players[key].hand);
        winningPlayers.push(key);
        console.log(`1 WinningPlayerIndex ${JSON.stringify(winningPlayers)}`);
        continue;
      }

      let curWinningHand: number = this.rankByHand.indexOf(players[key].hand);
      if(curWinningHand <= winningHand) {
        if(curWinningHand === winningHand) {
          winningPlayers.push(key);
          console.log(`2 WinningPlayerIndex ${JSON.stringify(winningPlayers)}`);
        }
        else {
          winningPlayers.splice(0, winningPlayers.length);
          winningHand = curWinningHand;
          winningPlayers.push(key);
          console.log(`3 WinningPlayerIndex ${JSON.stringify(winningPlayers)}`);
        }
      }
    }

    let winners: ArraySchema<Player> = new ArraySchema<Player>();
    let previousCards: MapSchema<any> = new MapSchema<any>();
    let sortPrevious: ArraySchema<any> = new ArraySchema<any>();
    let sameCards: ArraySchema<any> = new ArraySchema<any>();
    let sortCards: ArraySchema<number> = new ArraySchema<number>();

    if (winningPlayers.length > 1) {
      for(let i = 0; i < winningPlayers.length; i++) {
        sortCards.length = 0;
        for (let j = 0; j < players[winningPlayers[i]].cards.length; j++) {
          sortCards.push(players[winningPlayers[i]].cards[j].number);
          sortCards.sort((a,b) => { return b-a });         
        } 
        if (players[winningPlayers[i]].hand == 'Pair') {
          for (var j = 0; j < sortCards.length - 1; j++) {
            if (sortCards[j + 1] === sortCards[j]) {
              previousCards[players[winningPlayers[i]].id] = sortCards[j];
            }
          }
        } else {
          previousCards[players[winningPlayers[i]].id] = sortCards[0];
        }        
      }
      for (var k in previousCards) {
        sortPrevious.push([k, previousCards[k]]);
      } 
      sortPrevious.sort(function(a, b) {  return b[1] - a[1]; });
      
      if (sortPrevious[0][1] === sortPrevious[1][1]) {
        for (let k = 0; k < sortPrevious.length - 1; k++) {
          if (sortPrevious[0][1] === sortPrevious[k + 1][1]) {
            sameCards.push(sortPrevious[k]);
            sameCards.push(sortPrevious[k + 1]);
          }          
        } 
        
        sortPrevious.length = 0;

        previousCards = new MapSchema();
        
        for(let i = 0; i < sameCards.length; i++) {
          sortCards.length = 0;
          
          for (const playerId in players) {
            if (players[playerId].id === sameCards[i][0]) {
              for (let j = 0; j < 3; j++) {
                sortCards.push(players[playerId].cards[j].number);
                sortCards.sort((a,b) => { return b-a });    
              } 
              previousCards[sameCards[i][0]] = sortCards[1];
            } 
          }
        }
        for (var k in previousCards) {
          sortPrevious.push([k, previousCards[k]]);
        } 
        sortPrevious.sort(function(a, b) {  return b[1] - a[1]; });

        if (sortPrevious[0][1] === sortPrevious[1][1]) {
          for (let k = 0; k < sortPrevious.length - 1; k++) {
            if (sortPrevious[0][1] === sortPrevious[k + 1][1]) {
              sameCards.push(sortPrevious[k]);
              sameCards.push(sortPrevious[k + 1]);
            }          
          } 
          
          sortPrevious.length = 0;
  
          previousCards = new MapSchema();
          
          for(let i = 0; i < sameCards.length; i++) {
            sortCards.length = 0;
            
            for (const playerId in players) {
              if (players[playerId].id === sameCards[i][0]) {
                for (let j = 0; j < 3; j++) {
                  sortCards.push(players[playerId].cards[j].number);
                  sortCards.sort((a,b) => { return b-a });    
                } 
                previousCards[sameCards[i][0]] = sortCards[2];
              } 
            }
          }
          for (var k in previousCards) {
            sortPrevious.push([k, previousCards[k]]);
          } 
          sortPrevious.sort(function(a, b) {  return b[1] - a[1]; });
          
        } else {
          for (const playerId in players) {
            if (players[playerId].id === sortPrevious[0][0]) {
              winners.push(players[playerId]);
              console.log(`Winning Player ${JSON.stringify(winners)}`);
            }
          }
        }
      } else {
        for (const playerId in players) {
          if (players[playerId].id === sortPrevious[0][0]) {
            winners.push(players[playerId]);
            console.log(`Winning Player ${JSON.stringify(winners)}`);
          }
        } 
      }
    }
    else {
      for(let i = 0; i < winningPlayers.length; i++) {
        console.log(`Winning Index: ${winningPlayers[i]}`);
        winners.push(players[winningPlayers[i]]);
        console.log(`Winning Player ${JSON.stringify(winners)}`);
      }
    }
    return winners;
  }
}