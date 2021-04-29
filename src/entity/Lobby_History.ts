import {Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn} from "typeorm";
import { Lobby } from "./Lobby";
import { User_Profile } from "./User_Profile";

export enum LobbyStatusOp { Upcoming = "Upcoming", Live = "Live", Completed = "Completed"}

//to create tables
@Entity({ name: "Lobby_History", synchronize: false})
export class Lobby_History {

    @PrimaryGeneratedColumn()
    Lobby_History_Id: number;

    @OneToOne(type => Lobby, lobby => lobby.Lobby_Id)
    @JoinColumn()
    Lobby_Id: Lobby;

    @OneToOne(type => User_Profile, user => user.User_Id)
    @JoinColumn()
    User_Id: User_Profile;

    @Column({type: "enum", enum: ["Upcoming", "Live", "Completed"], default: "Upcoming"})
    Lobby_Status: LobbyStatusOp;

    //with boolean
    @Column()
    User_Win_Status: boolean; //yes = win, no = loss

    @Column()
    Amount: number;//winloss amount

    @Column()
    Round_Status: boolean; // yes = running, no = notrunning

    @Column()
    User_Status: boolean; // yes = playing, no = notplaying

    @Column()
    User_Seating: boolean; // yes = seat, no = notseat

    @Column()
    Lobby_Round: number;

    @Column()
    Total_Bet: number;

}