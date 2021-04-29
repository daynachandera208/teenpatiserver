/* Rename file as index.ts */
// only for demo - How to use functions in client and server side

import "reflect-metadata";
import "class-transformer";
import {createConnection} from "typeorm";
import {User} from "./entity/User";
import { serialize } from "class-transformer";
import { Console } from "console";
import { User_Profile } from "./entity/User_Profile";

createConnection().then(async connection => {

  console.log("connected....");
  
  //instance of user table
  //let user = new User();

  //To add entity(tables) values
  // user.Name = "ABCD";
  // user.Country = "Aus";
  // user.Level = 1;

  /*
  //create a table with entity manager---------start--
  //instance of Entitymanager and save the entity
  await connection.manager.save(user);
  //create a table with entity manager---------end--
  */

  /*
  //Add data with repository---------start--
  //instance for connection repository
  let userRepository = connection.getRepository(User);

  //save the data
  await userRepository.save(user);
  console.log("data saved...");

  let [all_users, usercount] = await userRepository.findAndCount();
  console.log("user count:", usercount + "\n");
  //Add data with repository---------end--
  */

  //Read data from the tables---------start--

  //instance for connection repository
  // let userRepository = connection.getRepository(User);
  
  //Find - Finds entities for the supplied options.
  // let savedUsers = await connection.manager.find(User);
  // console.log("All users", savedUsers);

  //findAndCount - Finds and counts entities for the supplied options. Pagination options (from and take) are ignored.
  // let [all_users, usercount] = await userRepository.findAndCount();
  // console.log("usercount: ", usercount);
  
  //findByIds - Finds entities for the supplied ids.
  // let savedUsers = await userRepository.findByIds([1,2]);
  // console.log("All users", serialize(savedUsers));
  
  //findOne - Finds the first entity that matches the options.
  //let savedUsers = await userRepository.findOne(1);// by index
  // let savedUsers = await userRepository.findOne({Name: "ABCD"}); //by properties
  // console.log("All users", serialize(savedUsers));
  
  //findOneOrFail - Finds the first entity that matches the options or fails.
  // let savedUsers = await userRepository.findOneOrFail(1); //option contains any data from table columns
  // let savedUsers = await userRepository.findOneOrFail({Name:"ABC"}); 
  // console.log("All users", serialize(savedUsers));
  
  //Read data from the tables---------end--

  //Update data from the tables---------start--

  //instance for connection repository
  // let userRepository = connection.getRepository(User);

  // let savedUsers = await userRepository.findOne(1);
  // savedUsers.Level = 2;//update data's
  // await userRepository.save(savedUsers);
  // console.log("All users", serialize(savedUsers));

  //Update data from the tables---------end--

  //Delete data from the tables---------start--

  //instance for connection repository
  // let userRepository = connection.getRepository(User);

  // let savedUsers = await userRepository.findOne(1);
  // let usercount = await userRepository.findAndCount();
  // console.log("before Data remove..",usercount);
  // await userRepository.remove(savedUsers);
  // usercount = await userRepository.findAndCount();
  // console.log("Data removed..",usercount);

  //Delete data from the tables---------end--

}).catch(error => console.log(error));
