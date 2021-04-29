//For Demo Example only not for teen Patti UI


import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";

//to create tables
@Entity({ name: "User", synchronize: false})
export class User {

    @PrimaryGeneratedColumn()
    Id: number;

    @Column({ unique: true })
    Name: string;

    @Column("text")
    Country: string;

    @Column()
    Level: number;

}
