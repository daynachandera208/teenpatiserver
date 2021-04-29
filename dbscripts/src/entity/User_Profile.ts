import { type } from "os";
import {Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn} from "typeorm";
import { Wallet } from "./Wallet";

//to create tables
@Entity({ name: "User_Profile", synchronize: false})
export class User_Profile {

    @PrimaryGeneratedColumn()
    User_Id: number;

    @Column({type: "varchar", unique: true })
    User_Name: string;

    @Column()
    User_DisplayName: string;

    @Column("varchar")
    User_Password: string;

    @Column("text")
    User_Country: string;

    @Column({ type: "bigint",unique: true})
    User_Mobile_Number: number;

    @Column({ type: "varchar",unique: true })
    User_Email_Id: string;

    @Column("blob")
    User_Image: string;

    @Column()
    User_Level: number;

    @OneToOne(type => Wallet, Wallet_Id => Wallet_Id.Wallet_Id, { cascade: true, onDelete:'CASCADE' })
    @JoinColumn()
    Wallet_Id: Wallet;



}
