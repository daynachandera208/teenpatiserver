import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn} from "typeorm";
import { Game } from "./Game";

//to create tables
@Entity({ name: "Variation", synchronize: false})
export class Variation {

    @PrimaryGeneratedColumn()
    Variation_Id: number;

    @ManyToOne(() => Game, game => game.Game_Id)
    @JoinColumn()
    Game_Id: Game;

    @Column({type: "varchar"})
    Variation_Name: string;

    @Column({length:3})
    Variation_Initial: string;

    @Column()
    Variation_Cards_Count: number; //3,4

    @Column()
    Variation_Deck: boolean;

    @Column()
    Variation_Joker: boolean;

}
