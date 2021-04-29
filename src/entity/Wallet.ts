import { type } from "os";
import {Entity, PrimaryGeneratedColumn, Column, JoinColumn, OneToOne} from "typeorm";
import { User_Profile } from "./User_Profile";

//to create tables
@Entity({ name: "Wallet", synchronize: false})
export class Wallet {

    @PrimaryGeneratedColumn()
    Wallet_Id: number;

    @OneToOne(type => User_Profile, user => user.User_Id, { cascade: true })
    @JoinColumn()
    User_Id: User_Profile;
    
    @Column()
    User_Bouns_cash: number;

    @Column()
    User_Chips: number;

    @Column()
    User_Credit_Amount: number;

    @Column()
    User_Debit_Amount: number;

    @Column()
    User_Win_Amount: number;

    @Column()
    User_Loss_Amount: number;
}
