import {Entity, PrimaryGeneratedColumn, Column, OneToMany, JoinColumn, OneToOne} from "typeorm";
import { Lobby } from "./Lobby";
import { User_Profile } from "./User_Profile";

//enum
export type ClubMemberRequest = "Pending"| "Approved"| "Rejected";

//to create tables
@Entity({ name: "Club", synchronize: false})
export class Club {

    @PrimaryGeneratedColumn()
    Club_Id: number;

    @Column({type: "varchar", unique: true })
    Club_Name: string;

    @Column({length:3})
    Club_Initial: string;

    @Column("blob")
    Club_Logo: string;

    @Column("bigint")
    Club_Money: number;

    @Column("text")
    Club_Notice: string;

    @OneToOne(type => User_Profile, clubowner => clubowner.User_Id)
    @JoinColumn()
    Club_owner_Id: User_Profile;

    @OneToOne(type => User_Profile, clubmember => clubmember.User_Id)
    @JoinColumn()
    Club_Member_Id: User_Profile;

    @Column({type: "enum", enum: ["Pending", "Approved", "Rejected"], default: "Pending"})
    Club_Member_Request_Status: ClubMemberRequest;

    @OneToMany(() => Lobby, lobby => lobby.Lobby_Id)
    @JoinColumn()
    Club_Lobby: Lobby[];

}
