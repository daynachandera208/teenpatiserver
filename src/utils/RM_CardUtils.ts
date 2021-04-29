import { MapSchema, ArraySchema } from '@colyseus/schema';
import { GameState, Player, Card } from "../State";
import { GameConfig } from "../GameConfig";
import { log } from 'console';
import { Client, Room } from 'colyseus';
import { PlayerUtils } from './PlayerUtils';

//Utility class for Cards
export class Var1CardUtils {
	playerUtils: PlayerUtils;
	totalCards = 52;
	suits = [
		'Heart', //0
		'Spade', //1
		'Club', //2
		'Diamond' //3
	];


	//These varaibles are just for refrence of how the card numbers are used by the back-end server
	//These are never used
	cards = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
	VALUE_MAP = {
		2: 1,		// Card number : Index number
		3: 2,
		4: 3,
		5: 4,
		6: 5,
		7: 6,
		8: 7,
		9: 8,
		10: 9,
		J: 10,
		Q: 11,
		K: 12,
		A: 13
	};

	//Randomized cards
	randomizePosition = (min: number, max: number) => {
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	//Get shuffle cards from deck
	getShuffledNums = () => {
		let shuffledNums = new Array<number>(this.totalCards);
		for (let i = 0; i < this.totalCards; i++) {
			if (i === 51) {
				// Fill last undefined slot when only 1 card left to shuffle
				const lastSlot = shuffledNums.findIndex((val) => val == undefined);
				shuffledNums[lastSlot] = i + 1;
			}
			else {
				let shuffleToPosition = this.randomizePosition(0, this.totalCards - 1);
				while (shuffledNums[shuffleToPosition]) {
					shuffleToPosition = this.randomizePosition(0, this.totalCards - 1);
				}
				shuffledNums[shuffleToPosition] = i + 1;
			}
		}
		return shuffledNums;
	}

	//Delete cards from deck and push to choosencard
	popCards = (deck: ArraySchema<Card>, numToPop: number) => {
		let chosenCards: ArraySchema<Card> = new ArraySchema<Card>();
		for (let i = 0; i < numToPop; i++) {
			chosenCards.push(deck.pop());
		}
		return { deck, chosenCards };
	}

	popSpecificCard(deck: ArraySchema<Card>, card: Card) {
		let sameSuit = deck.filter((c) => c.suit === card.suit);
		let popedCard = sameSuit.find(c => c.num === card.num);
		let popedCardIndex = deck.findIndex(c => c === popedCard);
		deck.splice(popedCardIndex, 1);
		return deck;
	}

	pushCard(deck: ArraySchema<Card>, card: Card) {
		deck.unshift(card);
		return deck;
	}

	getSuit(card: number): string {
		let res = Math.floor(card / 13);
		let mod = card % 13;
		if (mod == 0)
			res--;

		return this.suits[res];
	}

	getDeck(): ArraySchema<Card> {
		let nums = this.getShuffledNums();
		let deck: ArraySchema<Card> = new ArraySchema<Card>();
		nums.forEach((num) => {
			let number = num % 13;
			let newSuit = this.getSuit(num);
			if (number == 0)
				number = 13;
			let card: Card = new Card(number, newSuit);
			deck.push(card);
		});
		return deck;
	}

	revealPhaseComunityCards(phase: string, deck: ArraySchema<Card>) {
		let comCards: ArraySchema<Card> = new ArraySchema<Card>();
		let res;
		res = this.popCards(deck, 3);
		res.chosenCards.forEach((chosenCard) => {
			comCards.push(chosenCard);
		});

		return { deck: res.deck, communityCards: comCards };
	}

	computeHands(players: MapSchema<Player>, cardsInHand: number, rankByHand: string[]): MapSchema<Player> {
		for (let key in players) {
			let player: Player = players[key];

			console.log(`++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++`);
			console.log(`Player hand Compute for ${player.id}`);

			player = this.computeHandAsPerGameConfig(player, cardsInHand, rankByHand);

		}

		return players;
	}

	computeHandAsPerGameConfig(player: Player, cardsInHand: number, rankByHand: string[]): Player {
		// console.log(cardsInHand);
		let startPlayerCardIndex: number = 0;
		let nextPlayerCardIndex: number = 0;
		let playerCardUsed: number = 0;
		let startComCardIndex: number = 0;
		let nextComCardIndex: number = 0;
		let comCardUsed: number = 0;
		let counter: number = 0;

		let previousCards: ArraySchema<number> = new ArraySchema<number>();
		let previousSuits: ArraySchema<string> = new ArraySchema<string>();

		// console.log(cardsInHand);

		do {
			let playerCardsToBeUsed: ArraySchema<Card> = new ArraySchema<Card>();

			playerCardsToBeUsed.push(player.replacedCards[playerCardUsed]);
			playerCardUsed = (playerCardUsed + 1) % player.replacedCards.length;

			previousCards.push(player.replacedCards[playerCardUsed].num);
			previousSuits.push(player.replacedCards[playerCardUsed].suit);

			nextPlayerCardIndex = (nextPlayerCardIndex + 1) % player.replacedCards.length;
			playerCardUsed = nextPlayerCardIndex;

			console.log(`Next Player Card Start Index: ${nextPlayerCardIndex}`);

			let comCardsToBeUsed: ArraySchema<Card> = new ArraySchema<Card>();

			console.log(`In Comm Cards Do Cards in Hand: ${cardsInHand}`);

			let cardsToBeUsed: ArraySchema<Card> = new ArraySchema<Card>();

			playerCardsToBeUsed.forEach((card) => {
				cardsToBeUsed.push(card);
			});
			console.log("Player Card : " + JSON.stringify(cardsToBeUsed));

			let cardFrequency: MapSchema<number> = new MapSchema<number>();

			let suitFrequency: MapSchema<number> = new MapSchema<number>();

			previousCards.sort((a, b) => { return a - b });

			previousCards.forEach((card) => {
				if (cardFrequency[card]) {
					cardFrequency[card] += 1;
					return
				} cardFrequency[card] = 1;
			});
			previousSuits.forEach((suit) => {
				if (suitFrequency[suit]) {
					suitFrequency[suit] += 1;
					return
				} suitFrequency[suit] = 1;
			});

			console.log(`==================================================`);
			console.log(`Card Frequency ${JSON.stringify(cardFrequency)}`);
			console.log(`Suit Frequency ${JSON.stringify(suitFrequency)}`);
			console.log(`Previous Suits Used ${JSON.stringify(previousSuits)}`);
			console.log(`Previous Cards Used ${JSON.stringify(previousCards)}`);
			console.log(`Card To Be Use : ${JSON.stringify(cardsToBeUsed)}`);
			let handRes = this.computePlayerHand(suitFrequency, cardFrequency, cardsToBeUsed, previousCards);

			let changeRes: boolean = false;
			if (player.hand === undefined) {
				changeRes = true;
			}
			else {
				if (rankByHand.indexOf(player.hand) > rankByHand.indexOf(handRes.hand))
					changeRes = true;
			}

			if (changeRes) {
				player.hand = handRes.hand;
				player.bestHand.splice(0, player.bestHand.length);
				handRes.bestHand.forEach((card) => {
					player.bestHand.push(card);
				});
			}
		}

		while (nextPlayerCardIndex != startPlayerCardIndex);

		console.log(`Player Best Hand Name ${player.hand}`);
		// console.log(`Player Best Hand -- ${JSON.stringify(player.bestHand)}`);
		console.log(`==================================================`);

		return player;
	}

	computeHandsForCards(player: Player, cardsInHand: number, cards: ArraySchema<Card>, rankByHand: string[]): string {
		// console.log(cardsInHand);
		let startPlayerCardIndex: number = 0;
		let nextPlayerCardIndex: number = 0;
		let playerCardUsed: number = 0;
		let handRes;
		let previousCards: ArraySchema<number> = new ArraySchema<number>();
		let previousSuits: ArraySchema<string> = new ArraySchema<string>();

		// console.log(cardsInHand);

		do {
			let playerCardsToBeUsed: ArraySchema<Card> = new ArraySchema<Card>();

			playerCardsToBeUsed.push(cards[playerCardUsed]);
			playerCardUsed = (playerCardUsed + 1) % cards.length;

			previousCards.push(cards[playerCardUsed].num);
			previousSuits.push(cards[playerCardUsed].suit);

			nextPlayerCardIndex = (nextPlayerCardIndex + 1) % cards.length;
			playerCardUsed = nextPlayerCardIndex;

			let cardsToBeUsed: ArraySchema<Card> = new ArraySchema<Card>();

			playerCardsToBeUsed.forEach((card) => {
				cardsToBeUsed.push(card);
			});

			let cardFrequency: MapSchema<number> = new MapSchema<number>();

			let suitFrequency: MapSchema<number> = new MapSchema<number>();

			previousCards.sort((a, b) => { return a - b });

			previousCards.forEach((card) => {
				if (cardFrequency[card]) {
					cardFrequency[card] += 1;
					return
				} cardFrequency[card] = 1;
			});
			previousSuits.forEach((suit) => {
				if (suitFrequency[suit]) {
					suitFrequency[suit] += 1;
					return
				} suitFrequency[suit] = 1;
			});

			handRes = this.computePlayerHand(suitFrequency, cardFrequency, cardsToBeUsed, previousCards);

			// let changeRes: boolean = false;
			// if (player.hand === undefined) {
			// 	changeRes = true;
			// }
			// else {
			// 	if (rankByHand.indexOf(player.hand) > rankByHand.indexOf(handRes.hand))
			// 		changeRes = true;
			// }

			// if (changeRes) {
			// 	player.hand = handRes.hand;
			// 	player.bestHand.splice(0, player.bestHand.length);
			// 	handRes.bestHand.forEach((card) => {
			// 		player.bestHand.push(card);
			// 	});
			// }
		}

		while (nextPlayerCardIndex != startPlayerCardIndex);

		console.log("::::Cards::::HAND:::::::" + handRes.hand);
		return handRes.hand;
		// console.log(`Player Best Hand Name ${player.hand}`);
		// // console.log(`Player Best Hand -- ${JSON.stringify(player.bestHand)}`);
		// console.log(`==================================================`);

		// return player;
	}

	computePlayerHand(suitFrequency: MapSchema<number>, cardFrequency: MapSchema<number>, cardsToBeUsed: ArraySchema<Card>, sortCard: ArraySchema<number>) {

		const trail = this.isTrail(cardFrequency);
		const color = this.isColor(suitFrequency);

		const straightRes = this.isStraight(sortCard);

		const pureSequence = this.isPureSequence(sortCard, color.isColor);

		const frequencyRes = this.computeFrequency(cardsToBeUsed, cardFrequency);

		console.log(`isTrail: ${trail.isTrail} cards: ${JSON.stringify(cardFrequency)}`);

		console.log(`isColor: ${color.isColor}`);

		console.log(`isOnePair: ${frequencyRes.isPair}`);
		// console.log(`==================================================`);

		let bestHand: ArraySchema<Card> = new ArraySchema<Card>();
		let hand: string = undefined;

		if (trail.isTrail) {
			hand = `Trail`;
		}

		else if (pureSequence) {
			hand = `Pure Sequence`;
		}

		else if (straightRes) {
			hand = `Sequence`;
		}

		else if (color.isColor) {
			hand = `Color`;
		}

		else if (frequencyRes.isPair) {
			hand = `Pair`;
		}

		else {
			cardsToBeUsed.slice(0, 3).forEach((card) => {
				bestHand.push(card);
			});
			hand = `HighCard`;
		}
		return { bestHand: bestHand, hand: hand };
	}

	isTrail(cardFrequency: MapSchema<number>) {
		for (let card in cardFrequency) {
			if (cardFrequency[card] === 3) {
				return { isTrail: true };
			}
		}
		return { isTrail: false };
	}

	isPureSequence(cards: ArraySchema<number>, color: boolean) {
		if (!cards) {
			return { isStraightFlush: false, isLowStraightFlush: false };
		}
		const straightRes = this.isStraight(cards);
		if (straightRes && color) {
			return true;
		} else return false;
	}

	isStraight(cards: ArraySchema<number>) {
		return this.checkStraight(cards, false);
	}

	checkStraight(cards: ArraySchema<number>, forLow: boolean) {
		let seq = false;
		for (let i = 0; i < cards.length; i++) {
			if (i == 0) { }
			else {
				if(cards[2]==13 && cards[1]==2 && cards[0]==1)
				{
					seq = true;
					return seq;
				}
				
				if (cards[i] - cards[i - 1] == 1 && cards[i + 1] - cards[i] == 1) {
					seq = true;
					return seq;
				} else {
					seq = false;
					return seq;
				}
			}
		}
	}

	isColor(suitFrequency: MapSchema<number>) {
		for (let suit in suitFrequency) {
			if (suitFrequency[suit] === 3) {
				return { isColor: true, flushSuit: suit };
			}
		}
		return { isColor: false, flushSuit: null };
	}

	isPair(suitFrequency: MapSchema<number>) {
		for (let suit in suitFrequency) {
			if (suitFrequency[suit] === 2) {
				return { isPair: true, flushSuit: suit };
			}
		}
		return { isPair: false, flushSuit: null };
	}

	computeFrequency(cards: ArraySchema<Card>, cardFrequency: MapSchema<number>) {

		let isPair = false;
		let pairs: Array<number> = new Array<number>();

		for (let key in cardFrequency) {
			if (cardFrequency[key] === 2) {
				isPair = true;
				pairs.push(Number(key));
			}
		}
		// Ensure histogram arrays are sorted in descending order to build best hand top down
		pairs = pairs.sort((a, b) => b - a);

		return { isPair, pairs };
	}

	copyCards(cards: ArraySchema<Card>): ArraySchema<Card> {
		let copyCards: ArraySchema<Card> = new ArraySchema<Card>();
		cards.forEach((card) => {
			let newCard: Card = new Card(card.num, card.suit);
			copyCards.push(newCard);
		});
		return copyCards;
	}

	filterIndexCard(cards: ArraySchema<Card>, skipIndex: number): ArraySchema<Card> {
		let copyCards: ArraySchema<Card> = new ArraySchema<Card>();
		for (let i = 0; i < cards.length; i++) {
			if (i !== skipIndex) {
				let newCard: Card = new Card(cards[i].num, cards[i].suit);
				copyCards.push(newCard);
			}
		}
		return copyCards;
	}

	getSuitCards(cards: ArraySchema<Card>, suit: string): ArraySchema<Card> {
		let copyCards: ArraySchema<Card> = new ArraySchema<Card>();
		cards.forEach((card) => {
			if (card.suit === suit) {
				let newCard: Card = new Card(card.num, card.suit);
				copyCards.push(newCard);
			}
		});
		return copyCards;
	}

	//Check player cards with joker card
	checkJokerCards(player: Player, jokerCard: Card, deck: ArraySchema<Card>) {

		let playerCardUsed: number = 0;
		let nextPlayerCardIndex: number = 0;
		let playerCardNumber: number;

		//joker card and - and +

		//Get player details
		let playerCardsToBeUsed: ArraySchema<Card> = new ArraySchema<Card>();

		//Player card equal to joker card
		let equalCard: ArraySchema<Card> = new ArraySchema<Card>();

		//Player card not equal to joker card
		let otherCard: ArraySchema<Card> = new ArraySchema<Card>();

		for (let i = 0; i < player.cards.length; i++) {
			playerCardsToBeUsed.push(player.cards[playerCardUsed]);		//Added player cards to new array
			playerCardUsed = (playerCardUsed + 1) % player.cards.length;
		}

		//Player cards number
		let previousCards: ArraySchema<number> = new ArraySchema<number>();
		previousCards.push(player.cards[playerCardUsed].num);		//Add player cards number to array

		//Add next player cards to array
		nextPlayerCardIndex = (nextPlayerCardIndex + 1) % player.cards.length;
		playerCardUsed = nextPlayerCardIndex;
		console.log(`Next Player Card Start Index: ${nextPlayerCardIndex}`);

		//Previous card of joker card
		let jokerPreviousCard: Card = new Card((jokerCard.num - 1 == 0) ? 13 : jokerCard.num - 1, jokerCard.suit); //TODO Modulo

		if (jokerCard.num === 0) {
			jokerPreviousCard.num = 13;
		}

		//Next card of joker card
		let jokerNextCard: Card = new Card(jokerCard.num + 1 % 13, jokerCard.suit);

		//Get all player cards numbers
		playerCardsToBeUsed.forEach((card) => {
			playerCardNumber = card.num;

			//check player's card with joker card for similarity
			if (jokerCard.num === playerCardNumber || (jokerPreviousCard.num == card.num && jokerPreviousCard.suit == card.suit) || (jokerNextCard.num == card.num && jokerNextCard.suit == card.suit)) {
				//Replacing cards condition
				equalCard.push(card);
				console.log("Joker Card: 		" + JSON.stringify(jokerCard));
				console.log("Joker Previous Card: 		" + JSON.stringify(jokerPreviousCard));
				console.log("Joker Next Card: 		" + JSON.stringify(jokerNextCard));
				//this.replaceJokerCard();
			}
			else {
				otherCard.push(card);
			}
		});

		//if they had similar card to joker card than replace that card with other card from card checking condition.	
		if (equalCard.length >= 1) {

			if (equalCard.length == 1) {
				let jokerCardIndex = playerCardsToBeUsed.findIndex(
					(jC) =>
						(JSON.stringify(jC) === JSON.stringify(jokerCard)) ||
						(jC.num == jokerCard.num) ||
						(jokerPreviousCard.num == jC.num && jokerPreviousCard.suit == jC.suit) ||
						(jokerNextCard.num == jC.num && jokerNextCard.suit == jC.suit)
				);
				console.log("jokerCardIndex: " + jokerCardIndex);
				let newCard = this.checkOtherCardSeq(otherCard, equalCard, deck);
				return {
					rC: newCard.rC,
					nD: newCard.nD,
					jokerIndex: jokerCardIndex
				}
			}
			else if (equalCard.length == 2) {
				//Find the index of the first occurance of jokercard
				let jokerCardIndex1 = playerCardsToBeUsed.findIndex(
					(jC) =>
						(JSON.stringify(jC) === JSON.stringify(jokerCard)) ||
						(jC.num == jokerCard.num) ||
						(jokerPreviousCard.num == jC.num && jokerPreviousCard.suit == jC.suit) ||
						(jokerNextCard.num == jC.num && jokerNextCard.suit == jC.suit)
				);

				//Find the second joker card index
				let jokerCardIndex2 = playerCardsToBeUsed.findIndex(
					(jC) =>
					(playerCardsToBeUsed.indexOf(jC) != jokerCardIndex1) && // check that the jokercard2 index is not equal to the jokercard1 index
						((JSON.stringify(jC) === JSON.stringify(jokerCard)) ||
						(jC.num == jokerCard.num) ||
						(jokerPreviousCard.num == jC.num && jokerPreviousCard.suit == jC.suit) ||
						(jokerNextCard.num == jC.num && jokerNextCard.suit == jC.suit))
				);

				console.log("jokerCardIndex1: " + jokerCardIndex1);
				console.log("jokerCardIndex2: " + jokerCardIndex2);

				let newCard = this.checkOtherCardSeq(otherCard, equalCard, deck);
				return {
					rC: newCard.rC,
					nD: newCard.nD,
					jokerIndex1: jokerCardIndex1,
					jokerIndex2: jokerCardIndex2
				}
			}
			else { // Joker card length = 3, already a trail
				return {
					rC: equalCard,
					nD: deck,
				}
			}
		}
		else if (equalCard.length == 0) {
			return {
				rC: null,
				nD: deck,
			};
		}
		// else{
		// 	newCard = otherCard[0]; //Trail
		// 	return {newCard,deck};
		// }
	}

	//Check other card sequence conditions
	checkOtherCardSeq(otherCards: ArraySchema<Card>, equalCards: ArraySchema<Card>, deck: ArraySchema<Card>) {
		let newCard: Card = new Card();

		// #region NEW CODE
		otherCards.sort((a, b) => { return b.num - a.num });    //Sorting in decreasing order

		if (otherCards.length == 2) {
			let replacedCard: ArraySchema<Card> = new ArraySchema<Card>();
			let difference = Math.abs(otherCards[0].num - otherCards[1].num);
			if (difference === 12) {
				difference = 1;
			}
			let card1 = otherCards[0];
			let card2 = otherCards[1];

			if (card1.suit == card2.suit) {			// PURE SEQ
				let pureSeq = this.PureSeqAndSeqCheck(true, card1, card2, difference, deck);

				if (pureSeq.True) {
					replacedCard.push(pureSeq.nC);
					return {
						rC: replacedCard,
						nD: pureSeq.nD
					}
				}
				else {
					let seq = this.PureSeqAndSeqCheck(false, card1, card2, difference, deck);
					if (seq.True) {
						replacedCard.push(seq.nC);
						return {
							rC: replacedCard,
							nD: seq.nD
						}
					}
					else {
						let color = this.ColorCheck(deck, card1.suit);
						if (color.True) {
							replacedCard.push(color.nC);
							return {
								rC: replacedCard,
								nD: color.nD
							}
						}
						else {
							let pair = this.PairCheck(deck, card1, card2);
							if (pair.True) {
								replacedCard.push(pair.nC);
								return {
									rC: replacedCard,
									nD: pair.nD
								}
							}
						}
					}
				}
			}
			else if (card1.num === card2.num) {
				// CHECKING FOR TRAIL
				newCard.num = card1.num;
				newCard.suit = this.getRandomSuit(card1.suit, card2.suit);

				let isA = this.isAvailableinDeck(newCard, deck);
				if (isA.True) {
					replacedCard.push(newCard);
					return {
						rC: replacedCard,
						nD: isA.deck
					}
				}
				else {
					// PAIR
					let pairCard = this.getRandomCard(deck);
					replacedCard.push(pairCard.nC);
					return {
						rC: replacedCard,
						nD: pairCard.nD
					}		//Give any random card to the player
				}
			}
			else {
				let seq = this.PureSeqAndSeqCheck(false, card1, card2, difference, deck);
				if (seq.True) {
					replacedCard.push(seq.nC);
					return {
						rC: replacedCard,
						nD: seq.nD
					}
				}
				else {
					let pair = this.PairCheck(deck, card1, card2);
					if (pair.True) {
						replacedCard.push(pair.nC);
						return {
							rC: replacedCard,
							nD: pair.nD
						}
					}
				}
			}
		}
		else if (equalCards.length == 2) {
			let replacedCards: ArraySchema<Card> = new ArraySchema<Card>();

			let card = otherCards[0];

			// TRAIL CHECK
			for (let i = 0; i < this.suits.length; i++) {
				if (this.suits[i] != card.suit) {
					let searchCard: Card = new Card();
					searchCard.num = card.num;
					searchCard.suit = this.suits[i];
					let isA = this.isAvailableinDeck(searchCard, deck);
					if (isA.True) {
						if (replacedCards.length == 2) {
							return {
								rC: replacedCards,
								nD: isA.deck
							}
						}
						replacedCards.push(searchCard);
					}
				}
			}

			//PURE SEQ
			let pureSeqAFor2Jokers = this.PureSeqCheckFor2JokerCards(card, card.suit, replacedCards, deck);

			if (pureSeqAFor2Jokers.True) {
				return {
					rC: pureSeqAFor2Jokers.rC,
					nD: pureSeqAFor2Jokers.nD
				}
			}
			else {
				//SEQ
				let seqAFor2Jokers = this.SeqCheckFor2JokerCards(card, replacedCards, deck);

				if (seqAFor2Jokers.True) {
					return {
						rC: seqAFor2Jokers.rC,
						nD: seqAFor2Jokers.nD
					}
				}
				else {
					//COLOR
					let colorAndPairFor2Jokers = this.ColorCheckFor2JokerCards(card, replacedCards, deck);

					if (colorAndPairFor2Jokers.True) {
						return {
							rC: colorAndPairFor2Jokers.rC,
							nD: colorAndPairFor2Jokers.nD
						}
					}
					else {
						return {
							rC: null,
							nD: deck
						};
					}
				}
			}
		}
	}

	PureSeqAndSeqCheck(forPureSeq: boolean, card1: Card, card2: Card, difference: number, deck: ArraySchema<Card>) {
		let newCard: Card = new Card();

		if (forPureSeq) {
			newCard.suit = card1.suit;
		}
		else {
			newCard.suit = this.getRandomSuit();
		}

		if (difference == 1) {
			let previousCardNum = card2.num - 1;
			let nextCardNum = card1.num + 1 % 13;

			if (previousCardNum === 0) {
				previousCardNum = 13;
			}

			newCard.num = Math.max(previousCardNum, nextCardNum);

			let isA = this.isAvailableinDeck(newCard, deck);

			if (isA.True) {
				return {
					True: isA.True,
					nC: newCard,
					nD: isA.deck
				}
			}
			else {
				newCard.num = Math.min(previousCardNum, nextCardNum);
				let isA = this.isAvailableinDeck(newCard, deck);

				if (isA.True) {
					return {
						True: isA.True,
						nC: newCard,
						nD: isA.deck
					}
				}
				else {
					return {
						True: false,
						nC: null,
						nD: deck
					};
				}
			}
		}
		else if (difference == 2) {
			newCard.num = (card1.num + card2.num) / 2;
			let isA = this.isAvailableinDeck(newCard, deck);

			if (isA.True) {
				return {
					True: isA.True,
					nC: newCard,
					nD: isA.deck
				}
			}
			else {
				return {
					True: false,
					nC: null,
					nD: deck
				};
			}
		}
		else {
			return {
				True: false,
				nC: null,
				nD: deck
			};
		}

	}

	ColorCheck(deck: ArraySchema<Card>, curSuit: string) {
		let newCard: Card = new Card();
		newCard.suit = curSuit;
		let sameSuitCards = deck.filter((x) => (x.suit == curSuit));
		let maxCardNum = sameSuitCards.sort((a, b) => b.num - a.num)[0].num;
		newCard.num = maxCardNum;

		let isA = this.isAvailableinDeck(newCard, deck);

		if (isA.True) {
			return {
				True: isA.True,
				nC: newCard,
				nD: isA.deck
			}
		}
		else {
			return {
				nC: null,
				nD: deck
			};
		}
	}

	PairCheck(deck: ArraySchema<Card>, card1: Card, card2: Card) {
		let newCard: Card = new Card();

		let maxNum = Math.max(card1.num, card2.num);
		newCard.num = maxNum;
		newCard.suit = this.getRandomSuit(card1.suit, card2.suit);
		let isA = this.isAvailableinDeck(newCard, deck);

		if (isA.True) {
			return {
				True: isA.True,
				nC: newCard,
				nD: isA.deck
			}
		}
		else {
			let minNum = Math.min(card1.num, card2.num);
			newCard.num = minNum;
			newCard.suit = this.getRandomSuit(card1.suit, card2.suit);
			isA = this.isAvailableinDeck(newCard, deck);
			if (isA.True) {
				return {
					True: isA.True,
					nC: newCard,
					nD: isA.deck
				}
			}
			else {
				return {
					True: true,
					nC: this.getRandomCard(deck).nC,
					nD: this.getRandomCard(deck).nD
				}
			}
		}
	}

	PureSeqCheckFor2JokerCards(otherCard: Card, suit: string, replaceCard: ArraySchema<Card>, deck: ArraySchema<Card>) {
		let startSeqNum = otherCard.num - 2;
		let endSeqNum = otherCard.num + 2;

		let card1 = new Card(endSeqNum - 1, suit);
		let card2 = new Card(endSeqNum, suit);

		let areA = this.areAvailableinDeck(card1, card2, deck);

		if (areA.True) {
			replaceCard.push(card1);
			replaceCard.push(card2);
			return {
				True: areA.True,
				rC: replaceCard,
				nD: areA.deck
			}
		}
		else {
			card1.num = startSeqNum + 1;
			card2.num = endSeqNum - 1;

			let areA = this.areAvailableinDeck(card1, card2, deck);

			if (areA.True) {
				replaceCard.push(card1);
				replaceCard.push(card2);
				return {
					True: areA.True,
					rC: replaceCard,
					nD: areA.deck
				}
			}
			else {
				card1.num = startSeqNum;
				card2.num = startSeqNum + 1;

				let areA = this.areAvailableinDeck(card1, card2, deck);

				if (areA.True) {
					replaceCard.push(card1);
					replaceCard.push(card2);
					return {
						True: areA.True,
						rC: replaceCard,
						nD: areA.deck
					}
				}
				else {
					return {
						True: false,
						rC: null,
						nD: deck
					};
				}
			}
		}
	}

	SeqCheckFor2JokerCards(otherCard: Card, replaceCard: ArraySchema<Card>, deck: ArraySchema<Card>) {
		let startSeqNum = otherCard.num - 2;
		let endSeqNum = otherCard.num + 2;

		let card1 = new Card(endSeqNum - 1, this.getRandomSuit());
		let card2 = new Card(endSeqNum, this.getRandomSuit());

		let areA = this.areAvailableinDeck(card1, card2, deck);

		if (areA.True) {
			replaceCard.push(card1);
			replaceCard.push(card2);
			return {
				True: areA.True,
				rC: replaceCard,
				nD: areA.deck
			}
		}
		else {
			card1.num = startSeqNum + 1;
			card2.num = endSeqNum - 1;

			let areA = this.areAvailableinDeck(card1, card2, deck);

			if (areA.True) {
				replaceCard.push(card1);
				replaceCard.push(card2);
				return {
					True: areA.True,
					rC: replaceCard,
					nD: areA.deck
				}
			}
			else {
				card1.num = startSeqNum;
				card2.num = startSeqNum + 1;

				let areA = this.areAvailableinDeck(card1, card2, deck);

				if (areA.True) {
					replaceCard.push(card1);
					replaceCard.push(card2);
					return {
						True: areA.True,
						rC: replaceCard,
						nD: areA.deck
					}
				}
				else {
					return {
						True: false,
						rC: null,
						nD: deck
					};
				}
			}
		}
	}

	ColorCheckFor2JokerCards(otherCard: Card, replaceCard: ArraySchema<Card>, deck: ArraySchema<Card>) {
		let card1: Card = new Card();
		let card2: Card = new Card();

		card1.suit = otherCard.suit;
		card2.suit = otherCard.suit;

		let sameSuitCards = deck.filter((x) => (x.suit == otherCard.suit)).sort((a, b) => b.num - a.num);

		if (sameSuitCards.length < 2) {
			let pairAFor2Jokers = this.PairCheckFor2Jokers(otherCard, replaceCard, deck);
			if (pairAFor2Jokers.True) {
				return {
					rC: pairAFor2Jokers.rC,
					nD: pairAFor2Jokers.nD
				}
			}
		}

		for (let i = 0, j = 1; i < sameSuitCards.length, j < sameSuitCards.length; i += 2, j += 2) {
			let maxCardNum1 = sameSuitCards[i].num;
			let maxCardNum2 = sameSuitCards[j].num;

			card1.num = maxCardNum1;
			card2.num = maxCardNum2;

			let areA = this.areAvailableinDeck(card1, card2, deck);

			if (areA.True) {
				replaceCard.push(card1);
				replaceCard.push(card2);
				return {
					True: areA.True,
					rC: replaceCard,
					nD: areA.deck
				}
			}
			else {
				continue;
			}
		}
	}

	PairCheckFor2Jokers(card: Card, replaceCard: ArraySchema<Card>, deck: ArraySchema<Card>) {
		let card1: Card = new Card(card.num, this.getRandomSuit());
		let card2: Card = this.getRandomCard(deck).nC;

		let areA = this.areAvailableinDeck(card1, card2, deck);

		if (areA.True) {
			replaceCard.push(card1);
			replaceCard.push(card2);
			return {
				True: areA.True,
				rC: replaceCard,
				nD: areA.deck
			}
		}
	}

	isAvailableinDeck(searchCard: Card, deck: ArraySchema<Card>) {
		let searchIndex = deck.findIndex((card) => card.num == searchCard.num && card.suit == searchCard.suit);
		console.log("SI: " + searchIndex + "->" + JSON.stringify(searchCard));
		if (searchIndex != -1) {
			let newDeck = this.popSpecificCard(deck, searchCard);
			return { True: true, deck: newDeck };
		}
		else {
			let newDeck = deck;
			return { False: false, deck: newDeck };
		}
	}

	areAvailableinDeck(searchCard1: Card, searchCard2: Card, deck: ArraySchema<Card>) {
		let searchIndex1 = deck.findIndex((card) => card.num == searchCard1.num && card.suit == searchCard1.suit);
		console.log("SI1: " + searchIndex1 + "->" + JSON.stringify(searchCard1));
		if (searchIndex1 !== -1) {
			let newDeck = this.popSpecificCard(deck, searchCard1);

			let searchIndex2 = deck.findIndex((card) => card.num == searchCard2.num && card.suit == searchCard2.suit);
			console.log("SI2: " + searchIndex2 + "->" + JSON.stringify(searchCard2));

			if (searchIndex2 !== -1) {
				let nDeck = this.popSpecificCard(deck, searchCard2);
				return { True: true, deck: nDeck };
			}
			else {
				return { False: false, deck: deck }
			}
		}
		else {
			return { False: false, deck: deck };
		}
	}

	getRandomSuit(curSuit1: string = null, curSuit2: string = null): string {
		let count = 0;
		let tempCard: Card = new Card();

		tempCard.suit = this.suits[Math.floor(Math.random() * this.suits.length)];

		if (curSuit1 == null || curSuit2 == null) {
			return tempCard.suit;
		}
		while (tempCard.suit == curSuit1 || tempCard.suit == curSuit2) {
			if (count == this.suits.length) { break; }
			tempCard.suit = this.suits[Math.floor(Math.random() * this.suits.length)];
			count++;
		}

		return tempCard.suit;
	}

	//Get Random card from Deck
	getRandomCard(deck: ArraySchema<Card>) {
		let count = 0;
		let card: Card = new Card();
		card.suit = this.suits[Math.floor(Math.random() * this.suits.length)];
		card.num = Math.floor(Math.random() * 13) + 1;
		let isA = this.isAvailableinDeck(card, deck);
		while (!isA.True) {
			if (count === deck.length) {
				break;
			}
			card.suit = this.suits[Math.floor(Math.random() * this.suits.length)];
			card.num = Math.floor(Math.random() * 13) + 1;
			isA = this.isAvailableinDeck(card, deck);
			count++;
		}

		return {
			nC: card,		//Return new card
			nD: isA.deck		//Return new deck
		}
	}

	computePlayerCards(player: Player, cards: ArraySchema<Card>, replacedCards: ArraySchema<Card>) {
		this.computeHandAsPerGameConfig(player, 3, this.playerUtils.rankByHand);
	}
}