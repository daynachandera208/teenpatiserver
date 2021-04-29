import {Entity, PrimaryGeneratedColumn, Column, Timestamp, OneToOne, JoinColumn} from "typeorm";
import { User_Profile } from "./User_Profile";

//to create tables
@Entity({ name: "Payment", synchronize: false})
export class Payment {

    @PrimaryGeneratedColumn()
    Payment_Id: number;

    @OneToOne(type => User_Profile, user => user.User_Id)
    @JoinColumn()
    User_Id: User_Profile;
    
    @Column()
    Is_DebitCredit: boolean; //yes = debit, no = credit

    @Column()
    Payment_Amount: number;

    @Column("timestamp")
    Payment_Time_Date: Timestamp;
}



