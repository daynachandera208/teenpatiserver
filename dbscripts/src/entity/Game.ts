import {Entity, PrimaryGeneratedColumn, Column, OneToMany, JoinColumn} from "typeorm";
import { Variation } from "./Variation";

//to create tables
@Entity({ name: "Game", synchronize: false})
export class Game {

    @PrimaryGeneratedColumn()
    Game_Id: number;

    @Column({type: "varchar", unique: true })
    Game_Name: string;
    
    @Column("blob")
    Game_Icon: string;

    @OneToMany(() => Variation, Game_Variation => Game_Variation.Variation_Id)
    @JoinColumn()
    Game_Variation: Variation[];

}
