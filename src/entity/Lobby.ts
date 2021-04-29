import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToOne} from "typeorm";
import { Club } from "./Club";
import { User_Profile } from "./User_Profile";
import { Variation } from "./Variation";

export enum VariationOp {
    ORG = "ORG",
    RM = "RM",
    RTD = "RTD",
    OTH = "OTH"
}


//to create tables
@Entity({ name: "Lobby", synchronize: false})
export class Lobby {

    @PrimaryGeneratedColumn()
    Lobby_Id: number;

    @ManyToOne(() => Club, club => club.Club_Id)
    @JoinColumn()
    Club_Id: Club;

    @OneToOne(type => Variation, variation => variation.Variation_Id)
    @JoinColumn()
    Variation_Id: Variation;

    @OneToOne(type => User_Profile, owner => owner.User_Id)
    @JoinColumn()
    Lobby_Owner_Id: User_Profile;

    @Column()
    Lobby_Commision_Rate: number;

    @Column({type: "varchar", unique: true })
    Lobby_Name: string;

    @Column({type: "enum", enum: ["ORG", "RM", "RTD", "OTH"], default: "ORG"})//include variation data as options
    Lobby_Type: VariationOp;

    @Column()
    Lobby_Blinds: number;

    @Column()
    Lobby_Total_Persons: number;

    @Column()
    Lobby_Join_Players: number;

    @Column({type: "bigint"})
    Lobby_Action_Time: number;//in seconds

    @Column()
    Lobby_Boot_Amount: number;

    @Column()
    Lobby_Auto_Start: boolean;

    @Column()
    Lobby_Min_Player_Limit: number;

    @Column()
    Lobby_Auto_Extension: boolean;

    @Column("time")
    Lobby_Time: string;

    @Column()
    Lobby_Pot_Limit: number;

    @Column()
    Lobby_Min_Bet: number;

    @Column()
    Lobby_Max_Bet: number;

}
