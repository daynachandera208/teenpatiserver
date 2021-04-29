const express = require('express');
import { DbUtils } from "./utils/DbUtils";
import { User_Profile } from "./entity/User_Profile";
import { Wallet } from "./entity/Wallet";
import { createQueryBuilder } from 'typeorm';
import { serialize } from "class-transformer";
import { Game } from "./entity/Game";
import { Variation } from "./entity/Variation";
import { Club } from "./entity/Club";
import { Lobby } from "./entity/Lobby";
import { Lobby_History } from "./entity/Lobby_History";
import { Admin } from "./entity/Admin";
import { Payment } from "./entity/Payment";
import { matchMaker } from "colyseus";
import { metadata } from "../../src/metadata"
var Passwordhash = require('password-hash');


const router = express.Router();

//#region paritosh
//=======================Testing============================

/**
 * Test API for Checking if Server is up
 */
router.get('/admin/', async (req, res) => {
    console.log(req.hostname);
    res.send(`The Server is up on ${req.hostname}!!`);
});


//Create the lobby in paritcular 
router.post('/createroom', async (req, res) => {
    const options = req.body;
     const roomName = options.type;
    console.log(options);
    const connection = await DbUtils.getConnection();
    
    if (await connection.manager.findOne(Lobby, { where: { Lobby_Name: options.roomName } })) {
        return res.status(409).json({ message: 'The Lobby Name has been taken, please try another' });
    }
    
    const rooms = await matchMaker.create(roomName, options);   
    let lobby = new Lobby();
    lobby.Club_Id = await connection.manager.findOne(Club, { where: { Club_Id: options.club_ID } });
    lobby.Variation_Id = await connection.manager.findOne(Variation, { where: { Variation_Id: 5 } });
    lobby.Lobby_Owner_Id = await connection.manager.findOne(User_Profile, { where: { User_Id: options.owner_ID } });
    lobby.Lobby_Commision_Rate = 3;
    lobby.Lobby_Name = options.roomName;
    lobby.Lobby_Type = options.type;
    lobby.Lobby_Blinds = options.blinds;
    lobby.Lobby_Total_Persons = options.numberOfPlayers;
    lobby.Lobby_Join_Players = 5;
    lobby.Lobby_Action_Time = options.ActionTimeValue;
    lobby.Lobby_Boot_Amount = options.bootAmount;
    lobby.Lobby_Auto_Start = options.AutoStartPlayerNumber;
    lobby.Lobby_Min_Player_Limit = 2;
    lobby.Lobby_Auto_Extension = options.AutoExtension;
    lobby.Lobby_Time = "10";
    lobby.Lobby_Pot_Limit = options.maxPotLimit;
    lobby.Lobby_Min_Bet = options.bootAmount;
    lobby.Lobby_Max_Bet = options.maxBet;
    lobby.Room_Id = rooms.sessionId;
    await connection.manager.save(lobby);

    // let lobby1 = await connection.manager.findOne(Lobby, { where: { Lobby_Id: lobby.Lobby_Id } });
    // lobby1.Room_Id = "";
    // await connection.manager.save(lobby);
    res.send(`The Server is up on ${req.hostname}!! & Lobbi_id:  ${lobby.Lobby_Id}`);
    const room = await matchMaker.getRoomById(rooms.room.roomId);
    console.log(rooms.sessionId);
    let meta : metadata = new metadata();
    meta.Setvalue(options.roomName,options.pwd,options.owner_ID,options.club_ID,lobby.Lobby_Id)
    room.setMetadata(meta);
    console.log(room.metadata);
});

router.get('/roomdeatils', async (req, res) => {
    console.log(req.hostname);
    const connection = await DbUtils.getConnection();
    //console.log(connection);
    const rooms = await matchMaker.query({});

    console.log(rooms);

    res.send(`The Server is up on ${req.hostname}!!`)
});

router.get('/state/:room_id', async (req, res) => {
    console.log(req.hostname + req.params.room_id);
    const connection = await DbUtils.getConnection();
    //console.log(connection);
    const rooms = await matchMaker.getRoomById(req.params.room_id);

    console.log(rooms.state);

    res.send(`The Server is up on ${req.hostname}!!`)
});

router.get('/disponse/:room_id', async (req, res) => {
    console.log(req.hostname + req.params.room_id);
    const connection = await DbUtils.getConnection();
    //console.log(connection);
    const rooms = await matchMaker.getRoomById(req.params.room_id);
    rooms.disconnect();

    res.send(`The Server is up on ${req.hostname}!!`)
});
//#endregion

//#region admin
//=======================Registration & Login============================

/**
 * API to Create a new User (Registration)
 * Data Input Body
{
    "user_name":"ABC", "user_displayname":"ABC", "user_password":"qwer", "user_country":"India", "user_mob_no":7894561230, "user_email_id":"abc@gmail.com", "user_image":"Profile.png"
}
 */
router.post('/admin/user/register', async (req, res) => {
    console.log('POST /api/admin/user/register API call made');

    const { user_name, user_displayname, user_password, user_country, user_mob_no, user_email_id, user_image } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        if (await connection.manager.findOne(User_Profile, { where: { User_Name: user_name } })) {
            return res.status(409).json({ message: 'The Username has been taken, please try another' });
        }
        else if (await connection.manager.findOne(User_Profile, { where: { User_Mobile_Number: user_mob_no } })) {
            return res.status(409).json({ message: 'The Mobile number has been taken, please try another' });
        }
        else if (await connection.manager.findOne(User_Profile, { where: { User_Email_Id: user_email_id } })) {
            return res.status(409).json({ message: 'The Email Id has been taken, please try another' });
        }

        let user = new User_Profile();
        let wallet = new Wallet();
        wallet.User_Chips = 10000;
        wallet.User_Bouns_cash = 0;
        wallet.User_Credit_Amount = 0;
        wallet.User_Debit_Amount = 0;
        wallet.User_Win_Amount = 0;
        wallet.User_Loss_Amount = 0;
        await connection.manager.save(wallet);

        user.User_Id = wallet.Wallet_Id;
        user.User_Name = user_name;
        user.User_DisplayName = user_displayname;
        user.User_Password = Passwordhash.generate(user_password); //to convert password in hash 
        user.User_Country = user_country;
        user.User_Mobile_Number = user_mob_no;
        user.User_Email_Id = user_email_id;
        user.User_Image = user_image;
        user.User_Level = 1;
        user.Wallet_Id = wallet;
        await connection.manager.save(user);
        wallet.User_Id = user;
        await connection.manager.save(wallet);

        res.status(200).json({ message: 'User Registered successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


//=======================User full detail============================

/**
 * API to get a All Users details (User_Profile, Wallet) full details admin
 */
router.get('/admin/users', async (req, res) => {
    console.log('GET /api/admin/users API call made');

    try {
        const connection = await DbUtils.getConnection();
        let data = await connection.getRepository(User_Profile).createQueryBuilder()
            .select(['DISTINCT user.User_Id"User_Id"', 'user.User_Name"Username"',
                'user.User_DisplayName"User_DisplayName"', 'user.User_Country"User_Country"',
                'user.User_Mobile_Number"User_Mobile_Number"', 'user.User_Email_Id"User_Email_Id"', 'w.User_Chips"User_Chips"',
                'w.User_Win_Amount"User_Win_Amount"', 'w.User_Loss_Amount"User_Loss_Amount"'])
            .from(User_Profile, 'user')
            .innerJoin('user.Wallet_Id', 'w')
            //.take(10).skip(0)
            .getRawMany();

        console.log("length: ", data.length);
        if (data.length > 0) {
            return res.status(200).json({ data });
        }
        return res.status(400).json({ message: 'Data not available' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
* API to post a All Users details by user_name (User_Profile, Wallet) full details
*/
router.post('/admin/user', async (req, res) => {
    console.log('POST /api/admin/user API call made');
    const { user_name } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        let data1 = await connection.getRepository(User_Profile).createQueryBuilder()
            .select(['DISTINCT user.User_Id"User_Id"', 'user.User_Name"Username"',
                'user.User_DisplayName"User_DisplayName"', 'user.User_Country"User_Country"',
                'user.User_Mobile_Number"User_Mobile_Number"', 'user.User_Email_Id"User_Email_Id"',
                'w.User_Chips"User_Chips"', 'w.User_Win_Amount"User_Win_Amount"', 'w.User_Loss_Amount"User_Loss_Amount"'])
            .from(User_Profile, 'user')
            .innerJoin('user.Wallet_Id', 'w')
            .where("user.User_Name = :name", { name: user_name })
            .getRawOne();

        let data = [];
        data.push(data1);

        if (data) {
            return res.status(200).json({ data });
        }
        return res.status(400).json({ message: 'Data not available' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
* Remove a User details from user_id
*/
router.delete('/admin/user', async (req, res) => {
    console.log('DELETE /api/admin/user API call made');
    const { user_id } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        const exists = await connection.manager.findOne(User_Profile, { where: { User_Id: user_id } });
        if (!exists) {
            return res.status(409).json({ message: 'User is not exist' });
        }
        //delete wallet data
        await connection.getRepository(Wallet).createQueryBuilder()
            .delete()
            .where("Wallet.Wallet_Id = :id", { id: user_id })
            .execute();

        //delete user data
        let data = await connection.getRepository(User_Profile).createQueryBuilder()
            .delete("")
            .where("User_Profile.User_Id = :id", { id: user_id })
            .execute();

        // console.log("delete User: ", data);
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//=======================Game only============================

/**
 * API to get a All Games Only Admin
 */
router.get('/admin/games', async (req, res) => {
    console.log('GET /api/admin/games API call made');

    try {
        const connection = await DbUtils.getConnection();
        const data = await connection.getRepository(Game)
            .createQueryBuilder()
            .select(['DISTINCT gm.Game_Id"Game_Id"', 'gm.Game_Name"Game_Name"'])
            .from(Game, 'gm')
            .getRawMany();

        console.log("all users:", data.length);
        if (data.length > 0) {
            return res.status(200).json({ data });
        }
        return res.status(400).json({ message: 'data not available' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * API to get a Game Only from game_name (searching by name)
 */
router.post('/admin/games', async (req, res) => {
    console.log('POST /api/admin/games API call made');
    const { game_name } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        const data1 = await connection.getRepository(Game).createQueryBuilder()
            .select(['DISTINCT gm.Game_Id"Game_Id"', 'gm.Game_Name"Game Name"'])
            .from(Game, 'gm')
            .where("gm.Game_Name = :name", { name: game_name })
            .getRawOne();

        let data = [];
        data.push(data1);

        if (data) {
            return res.status(200).json({ data });
        }

        return res.status(400).json({ message: 'Data does not exists' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//=======================Variation======================

/**
 * API to get a Variation from game_name (searching by name) admin
 */
router.post('/admin/variation/game', async (req, res) => {
    console.log('GET /api/admin/variation/game API call made');
    const { game_name } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        const game = await connection.manager.findOne(Game, { where: { Game_Name: game_name } });

        // console.log("game:" , game);
        const data1 = await connection.manager.findOne(Variation, { where: { Game_Id: game } });
        // console.log("game:" , data);
        if (data1) {
            let data = [];
            data.push(data1);
            return res.status(200).json({ data });
        }

        return res.status(400).json({ message: 'Data does not exists' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//=======================Club============================

/**
 * API to Create a new Club
 * Data Input Body
{
    "club_name":"Demo", "club_initial":"DEM", "club_logo":"club.png", "club_money":2000, "club_notice":"it's notice", "club_owner_id":1, "club_member_id":2, "club_member_request_status":"Pending"
}
 */
router.post('/admin/club', async (req, res) => {
    console.log('POST /api/admin/club API call made');

    const { club_name, club_initial, club_logo, club_money, club_notice, club_owner_id, club_member_id, club_member_request_status } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        if (await connection.manager.findOne(Club, { where: { Club_Name: club_name } })) {
            return res.status(409).json({ message: 'The Club Name has been taken, please try another' });
        }

        let club = new Club();
        club.Club_Name = club_name;
        club.Club_Initial = club_initial;
        club.Club_Logo = club_logo;
        club.Club_Money = club_money;
        club.Club_Notice = club_notice;
        club.Club_owner_Id = await connection.manager.findOne(User_Profile, { where: { User_Id: club_owner_id } });
        club.Club_Member_Id = await connection.manager.findOne(User_Profile, { where: { User_Id: club_member_id } });
        club.Club_Member_Request_Status = club_member_request_status;
        await connection.manager.save(club);

        res.status(200).json({ message: 'Club Added successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * API to get a All Club------------------------------------------------------------------------------------changes Pending
 */
router.get('/admin/clubs', async (req, res) => {
    console.log('GET /api/admin/clubs API call made');

    try {
        const connection = await DbUtils.getConnection();
        const data = await connection.getRepository(Club).createQueryBuilder()
            .select(['DISTINCT clb.Club_Id"Club_Id"', 'clb.Club_Name"Clubname"',
                'clb.Club_Initial"Club_Initial"', 'clb.Club_Money"Club_Money"',
                'owner.User_Name"Owner_Name"', 'member.User_Name"Member_Name"',
                'clb.Club_Member_Request_Status"Club_Member_Request_Status"'])
            .from(Club, 'clb')
            .innerJoin('clb.Club_owner_Id', 'owner')
            .innerJoin('clb.Club_Member_Id', 'member')
            .getRawMany();

        console.log("all users:", data.length);
        console.log("all users data:", data);

        if (data.length > 0) {
            // console.log("users data....");
            //const users = await connection.manager.find(User_Profile);
            return res.status(200).json({ data });
        }
        return res.status(400).json({ message: 'data not available' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * API to get a Club from club_name (searching by name)
 */
router.get('/admin/club', async (req, res) => {
    console.log('GET /api/admin/club API call made');
    const { club_name } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        const data = await connection.manager.findOne(Club, { where: { Club_Name: club_name } });

        if (data) {

            return res.status(200).json({ data });
        }

        return res.status(400).json({ message: 'Data does not exists' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * Update a Club from club_id
 * * Data Input Body
{
    "club_id":1, "club_name":"Demo", "club_initial":"DEM", "club_logo":"club.png", "club_money":2000, "club_notice":"it's notice", "club_owner_id":1, "club_member_id":2, "club_member_request_status":"Pending"
}
 */
router.put('/admin/club', async (req, res) => {
    console.log('PUT /api/admin/club API call made');

    const { club_id, club_name, club_initial, club_logo, club_money, club_notice, club_owner_id, club_member_id, club_member_request_status } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        const exists = await connection.manager.findOne(Club, { where: { Club_Id: club_id } });
        if (!exists) {
            return res.status(409).json({ message: 'Club is not exist, please try another' });
        }

        const data = await connection.getRepository(Club)
            .createQueryBuilder()
            .update(Club)
            .set({
                Club_Name: club_name,
                Club_Initial: club_initial,
                Club_Logo: club_logo,
                Club_Money: club_money,
                Club_Notice: club_notice,
                Club_owner_Id: club_owner_id,
                Club_Member_Id: club_member_id,
                Club_Member_Request_Status: club_member_request_status


            })
            .where("Club_Id = :id", { id: club_id })
            .execute();

        res.status(200).json({ message: 'Data updated successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//#region Remove club
// /**
//  * Remove a Club with lobbies from club_id
//  */
//  router.delete('/club', async (req, res) => {
//     console.log('DELETE /api/club API call made');
//     const { club_id } = req.body;

//     try {
//         const connection = await DbUtils.getConnection();
//         let exists = await connection.manager.findOne(Club, { where: { Club_Id: club_id  } });
//         console.log("delete Data1: ", exists);
//         if(!exists) {
//             return res.status(409).json({ message: 'Club is not exist'});
//         }
//         let data = await connection.getRepository(Club).createQueryBuilder()
//         .delete()
//         .from(Club)
//         .where("Club_Id = :id", { id: club_id })
//         .execute();

//         // await connection.getRepository().remove(exists)
//         // console.log("check delete Data: ", exists);
//         res.status(200).json({ message: 'Club deleted successfully' });   
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// });
//#endregion

/**
 * Remove a Club with lobbies from club_id
 */
router.delete('/admin/club', async (req, res) => {
    console.log('DELETE /api/admin/club API call made');
    const { club_id } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        let exists = await connection.manager.findAndCount(Lobby, { where: { Lobby_Id: club_id } });
        if (!exists) {
            return res.status(409).json({ message: 'Lobby is not exist' });
        }
        console.log("delete Data1: ", exists);
        let data = await connection.getRepository(Lobby).createQueryBuilder()
            .delete()
            .from(Lobby)
            .where("Club_Id.Club_Id = :id", { id: club_id })
            .execute();

        // await connection.getRepository().remove(exists);
        exists = await connection.manager.findOne(Club, { where: { Club_Id: club_id } });
        if (!exists) {
            return res.status(409).json({ message: 'Club is not exist' });
        }
        console.log("delete Data2: ", exists);
        data = await connection.getRepository(Club).createQueryBuilder()
            .delete()
            .from(Club)
            .where("Club_Id = :id", { id: club_id })
            .execute();

        // await connection.getRepository().remove(exists);
        console.log("check delete Data: ", exists);
        res.status(200).json({ message: 'Club deleted successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//=======================Lobby only============================

/**
 * API to Create a new Lobby
 * Data Input Body
{
    "club_id":1, "variation_id":2, "lobby_owner_id":1,"lobby_commision_rate":2,"lobby_name":"Test", "lobby_type":"ORG", "lobby_blinds":4, "lobby_total_persons":9, "lobby_join_players":4, "lobby_action_time":30, "lobby_boot_amount":500, "lobby_auto_start":false, "lobby_min_player_limit":2, "lobby_auto_extension":false, "lobby_time":"5:00", "lobby_pot_limit":50000, "lobby_min_bet":50, "lobby_max_bet":5000, "lobby_status": "Upcoming", "room_id":"AFRRG23"
}
 */
router.post('/admin/lobby', async (req, res) => {
    console.log('POST /api/admin/lobby API call made');

    const { club_id, variation_id, lobby_owner_id, lobby_commision_rate, lobby_name, lobby_type, lobby_blinds, lobby_total_persons, lobby_join_players, lobby_action_time, lobby_boot_amount, lobby_auto_start, lobby_min_player_limit, lobby_auto_extension, lobby_time, lobby_pot_limit, lobby_min_bet, lobby_max_bet, lobby_status, room_id } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        if (await connection.manager.findOne(Lobby, { where: { Lobby_Name: lobby_name } })) {
            return res.status(409).json({ message: 'The Lobby Name has been taken, please try another' });
        }

        let lobby = new Lobby();
        lobby.Club_Id = await connection.manager.findOne(Club, { where: { Club_Id: club_id } });
        lobby.Variation_Id = await connection.manager.findOne(Variation, { where: { Variation_Id: variation_id } });
        lobby.Lobby_Owner_Id = await connection.manager.findOne(User_Profile, { where: { User_Id: lobby_owner_id } });
        lobby.Lobby_Commision_Rate = lobby_commision_rate;
        lobby.Lobby_Name = lobby_name;
        lobby.Lobby_Type = lobby_type;
        lobby.Lobby_Blinds = lobby_blinds;
        lobby.Lobby_Total_Persons = lobby_total_persons;
        lobby.Lobby_Join_Players = lobby_join_players;
        lobby.Lobby_Action_Time = lobby_action_time;
        lobby.Lobby_Boot_Amount = lobby_boot_amount;
        lobby.Lobby_Auto_Start = lobby_auto_start;
        lobby.Lobby_Min_Player_Limit = lobby_min_player_limit;
        lobby.Lobby_Auto_Extension = lobby_auto_extension;
        lobby.Lobby_Time = lobby_time;
        lobby.Lobby_Pot_Limit = lobby_pot_limit;
        lobby.Lobby_Min_Bet = lobby_min_bet;
        lobby.Lobby_Max_Bet = lobby_max_bet;
        lobby.Room_Id = room_id;
        lobby.Lobby_Status = lobby_status;

        await connection.manager.save(lobby);

        res.status(200).json({ message: 'Lobby Added successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * API to get a All Lobby
 */
router.get('/admin/lobbies', async (req, res) => {
    console.log('GET /api/admin/lobbies API call made');

    try {
        const connection = await DbUtils.getConnection();
        const data = await connection.getRepository(Lobby).createQueryBuilder()
            .select(['DISTINCT lb.Lobby_Id"Lobby_Id"', 'club.Club_Name"Club_Name"',
                'var.Variation_Initial"Variation"', 'owner.User_Name"Owner_Name"',
                'lb.Lobby_Commision_Rate"Lobby_Commision_Rate"', 'lb.Lobby_Name"Lobby_Name"',
                'lb.Lobby_Blinds"Lobby_Blinds"', 'lb.Lobby_Total_Persons"Lobby_Total_Persons"',
                'lb.Lobby_Join_Players"Lobby_Join_Players"', 'lb.Lobby_Boot_Amount"Lobby_Boot_Amount"',
                'lb.Lobby_Min_Player_Limit"Lobby_Min_Player_Limit"', 'lb.Lobby_Time"Lobby_Time"',
                'lb.Lobby_Pot_Limit"Lobby_Pot_Limit"', 'lb.Lobby_Min_Bet"Lobby_Min_Bet"',
                'lb.Lobby_Max_Bet"Lobby_Max_Bet"', 'lb.Lobby_Status"Lobby_Status"',
                'lb.Lobby_Action_Time"Lobby_Action_Time"', 'lb.Lobby_Auto_Start"Lobby_Auto_Start"',
                'lb.Lobby_Auto_Extension"Lobby_Auto_Extension"'])
            .from(Lobby, 'lb')
            .innerJoin('lb.Club_Id', 'club')
            .innerJoin('lb.Variation_Id', 'var')
            .innerJoin('lb.Lobby_Owner_Id', 'owner')
            .getRawMany();

        console.log("all users:", data.length);
        console.log("all users:", data.length);
        if (data.length > 0) {
            // console.log("users data....");
            return res.status(200).json(data);
        }
        return res.status(400).json({ message: 'data not available' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * API to get a Lobby from club_id (searching by id)
 */
router.post('/admin/lobbies', async (req, res) => {
    console.log('POST /api/admin/lobby API call made');
    const { club_id } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        const data = await connection.getRepository(Lobby).createQueryBuilder()
            .select(['DISTINCT lb.Lobby_Id"Lobby_Id"', 'club.Club_Name"Club_Name"',
                'var.Variation_Initial"Variation"', 'owner.User_Name"Owner_Name"',
                'lb.Lobby_Commision_Rate"Lobby_Commision_Rate"', 'lb.Lobby_Name"Lobby_Name"',
                'lb.Lobby_Blinds"Lobby_Blinds"', 'lb.Lobby_Total_Persons"Lobby_Total_Persons"',
                'lb.Lobby_Join_Players"Lobby_Join_Players"', 'lb.Lobby_Boot_Amount"Lobby_Boot_Amount"',
                'lb.Lobby_Min_Player_Limit"Lobby_Min_Player_Limit"', 'lb.Lobby_Time"Lobby_Time"',
                'lb.Lobby_Pot_Limit"Lobby_Pot_Limit"', 'lb.Lobby_Min_Bet"Lobby_Min_Bet"',
                'lb.Lobby_Max_Bet"Lobby_Max_Bet"', 'lb.Lobby_Status"Lobby_Status"',
                'lb.Lobby_Action_Time"Lobby_Action_Time"', 'lb.Lobby_Auto_Start"Lobby_Auto_Start"',
                'lb.Lobby_Auto_Extension"Lobby_Auto_Extension"'])
            .from(Lobby, 'lb')
            .innerJoin('lb.Club_Id', 'club')
            .innerJoin('lb.Variation_Id', 'var')
            .innerJoin('lb.Lobby_Owner_Id', 'owner')
            .where("lb.Club_Id = :id", { id: club_id })
            .getRawMany();

        // let data =[];
        // data.push(data1);

        if (data) {

            return res.status(200).json({ data });
        }

        return res.status(400).json({ message: 'Data does not exists' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * Update a Lobby from lobby_id
 * * Data Input Body

 */
router.put('/admin/lobby', async (req, res) => {
    console.log('PUT /api/admin/lobby API call made');

    const { lobby_id, lobby_name, lobby_commision_rate, lobby_blinds, lobby_total_persons, lobby_action_time, lobby_boot_amount, lobby_auto_start, lobby_min_player_limit, lobby_auto_extension, lobby_time, lobby_pot_limit, lobby_min_bet, lobby_max_bet, lobby_status } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        const exists = await connection.manager.findOne(Lobby, { where: { Lobby_Id: lobby_id } });
        if (!exists) {
            return res.status(409).json({ message: 'Lobby is not exist, please try another' });
        }

        const data = await connection.getRepository(Lobby)
            .createQueryBuilder()
            .update(Lobby)
            .set({
                Lobby_Name: lobby_name,
                Lobby_Commision_Rate: lobby_commision_rate,
                Lobby_Blinds: lobby_blinds,
                Lobby_Total_Persons: lobby_total_persons,
                Lobby_Action_Time: lobby_action_time,
                Lobby_Boot_Amount: lobby_boot_amount,
                Lobby_Auto_Start: lobby_auto_start,
                Lobby_Min_Player_Limit: lobby_min_player_limit,
                Lobby_Auto_Extension: lobby_auto_extension,
                Lobby_Time: lobby_time,
                Lobby_Pot_Limit: lobby_pot_limit,
                Lobby_Min_Bet: lobby_min_bet,
                Lobby_Max_Bet: lobby_max_bet,
                Lobby_Status: lobby_status
            })
            .where("Lobby_Id = :id", { id: lobby_id })
            .execute();

        res.status(200).json({ message: 'Data updated successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});



//=======================Lobby_History============================

/**
 * API to get a Lobby_History from lobby_id (searching by id)
 */
router.post('/admin/lobby_history', async (req, res) => {
    console.log('POST /api/admin/lobby_history API call made');
    const { lobby_id } = req.body;
    try {
        const connection = await DbUtils.getConnection();
        const data = await connection.getRepository(Lobby_History).createQueryBuilder()
            .select(['DISTINCT lbh.Lobby_History_Id"Lobby_History_Id"', 'lb.Lobby_Name"Lobby_Name"',
                'user.User_Name"User_Name"',
                'lbh.User_Win_Status"User_Win_Status"', 'lbh.Amount"Amount"',
                'lbh.Round_Status"Round_Status"',
                'lbh.Lobby_Round"Lobby_Round"', 'lbh.Total_Bet"Total_Bet"'])
            .from(Lobby_History, 'lbh')
            .innerJoin('lbh.Lobby_Id', 'lb')
            .innerJoin('lbh.User_Id', 'user')
            .where("lbh.Lobby_Id.Lobby_Id = :id", { id: lobby_id })
            .getRawMany();

        if (data) {
            return res.status(200).json({ data });
        }
        return res.status(400).json({ message: 'Data does not exists' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//=======================Admin============================

/**
 * API to Verify a new Admin (login)
 */
router.get('/admin/login', async (req, res) => {
    console.log('GET /api/admin/login API call made');

    const { admin_name, admin_password } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        const loginuser = await connection.manager.findOne(Admin, { where: { Admin_Name: admin_name } });
        if (loginuser && (Passwordhash.verify(admin_password, loginuser.Admin_Password))) {
            return res.status(200).json({ message: 'Admin login successfully' });
        }
        return res.status(200).json({ message: 'Incorrect Adminname or Password' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * API to Create a Admin
 * {
    "admin_name":"admin4", "admin_role":"SubAdmin", "admin_password":"admin" 
}
 */
router.post('/admin/createadmin', async (req, res) => {
    console.log('POST /api/admin/createadmin API call made');
    const { admin_name, admin_role, admin_password } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        if (await connection.manager.findOne(Admin, { where: { Admin_Name: admin_name } })) {
            return res.status(409).json({ message: 'The Admin Name has been taken, please try another' });
        }

        let admin = new Admin();
        admin.Admin_Name = admin_name;
        admin.Admin_Roles = admin_role;
        admin.Admin_Password = Passwordhash.generate(admin_password);
        await connection.manager.save(admin);

        return res.status(200).json({ message: 'Admin added successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * API to get a All Admin
 */
router.get('/admin/admins', async (req, res) => {
    console.log('GET /api/admin/admins API call made');

    try {
        const connection = await DbUtils.getConnection();
        const data = await connection.manager.find(Admin);
        console.log("all users:", data);
        if (data.length > 0) {
            // console.log("users data....");
            //const users = await connection.manager.find(User_Profile);
            return res.status(200).json({ data });
        }
        return res.status(400).json({ message: 'data not available' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * API to get a Admin from admin_name (searching by name)
 */
router.post('admin/admins', async (req, res) => {
    console.log('POST /api/admin/admins API call made');
    const { admin_name } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        const data1 = await connection.manager.findOne(Admin, { where: { Admin_Name: admin_name } });

        let data = [];
        data.push(data1);

        if (data) {
            return res.status(200).json({ data });
        }
        return res.status(400).json({ message: 'Data does not exists' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * Update a Admin from admin_id
 * * Data Input Body
{
    "admin_id":1, "admin_name":"admin4", "admin_role":"SubAdmin", "admin_password":"admin" 
}
 */
router.put('/admin/admin', async (req, res) => {
    console.log('PUT /api/admin/admin API call made');

    const { admin_id, admin_name, admin_role, admin_password } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        const exists = await connection.manager.findOne(Admin, { where: { Admin_Id: admin_id } });
        if (!exists) {
            return res.status(409).json({ message: 'Admin is not exist, please try another' });
        }

        const data = await connection.getRepository(Admin)
            .createQueryBuilder()
            .update(Admin)
            .set({
                Admin_Name: admin_name,
                Admin_Roles: admin_role,
                Admin_Password: Passwordhash.generate(admin_password)
            })
            .where("Admin_Id = :id", { id: admin_id })
            .execute();

        res.status(200).json({ message: 'Data updated successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * Remove a Admin from admin_id
 */
router.delete('/admin/admin', async (req, res) => {
    console.log('DELETE /api/admin/admin API call made');
    const { admin_id } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        let exists = await connection.manager.findOne(Admin, { where: { Admin_Id: admin_id } });
        if (!exists) {
            return res.status(409).json({ message: 'Admin is not exist' });
        }
        console.log("delete Data1: ", exists);
        let data = await connection.getRepository(Admin).createQueryBuilder()
            .delete()
            .from(Admin)
            .where("Admin_Id = :id", { id: admin_id })
            .execute();

        // await connection.getRepository().remove(exists);
        console.log("check delete Data: ", exists);
        res.status(200).json({ message: 'Admin deleted successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//=======================Payment============================

/**
 * API to Create a new Payment
 * Data Input Body
{
    "user_id":7, "isdebitcredit":0, "payment_amount":3000
}
*/
router.post('/admin/payments', async (req, res) => {
    console.log('POST /api/admin/payment API call made');

    const { user_id, isdebitcredit, payment_amount } = req.body;

    try {
        const connection = await DbUtils.getConnection();

        let payment = new Payment();
        payment.User_Id = await connection.manager.findOne(User_Profile, { where: { User_Id: user_id } });
        console.log("debit:", isdebitcredit);
        payment.Is_DebitCredit = isdebitcredit;
        console.log("debit:", payment.Is_DebitCredit);
        payment.Payment_Amount = payment_amount;
        await connection.manager.save(payment);

        console.log("wallet:", payment.User_Id.User_Id);
        let chips;
        let wallet = await connection.manager.findOne(Wallet, { where: { User_Id: payment.User_Id.User_Id } });
        console.log("data:", wallet);
        if (isdebitcredit) {
            chips = wallet.User_Chips - payment_amount;
            console.log("chips:", chips);
        }
        else {
            chips = wallet.User_Chips + payment_amount;
            console.log("chips:", chips);
        }
        wallet.User_Chips = chips;
        await connection.manager.save(wallet);

        res.status(200).json({ message: 'Payment Created successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


/**
 * API to get a All Payment
 */
router.get('/admin/payment', async (req, res) => {
    console.log('GET /api/admin/payment API call made');

    try {
        const connection = await DbUtils.getConnection();
        let data = await connection.getRepository(Payment).createQueryBuilder()
            .select(['DISTINCT pm.Payment_Id"Payment_Id"', 'pm.Is_DebitCredit"Is_DebitCredit"',
                'user.User_Name"User_Name"', 'pm.Payment_Amount"Payment_Amount"',
                'pm.Payment_Time_Date"Payment_Time_Date"'])
            .from(Payment, 'pm')
            .innerJoin('pm.User_Id', 'user')
            // .where("lb.Lobby_Id = :id", { id: lobby_id })
            .getRawMany();

        console.log("all users:", data.length);
        if (data.length > 0) {
            // console.log("users data....");
            //const users = await connection.manager.find(User_Profile);
            return res.status(200).json({ data });
        }
        return res.status(400).json({ message: 'data not available' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * API to get a Payment from user_id (searching by id)
 */
router.post('/admin/payment', async (req, res) => {
    console.log('POST /api/admin/payment API call made');
    const { user_id } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        let data = await connection.getRepository(Payment).createQueryBuilder()
            .select(['DISTINCT pm.Payment_Id"Payment_Id"', 'pm.Is_DebitCredit"Is_DebitCredit"',
                'user.User_Name"User_Name"', 'pm.Payment_Amount"Payment_Amount"',
                'pm.Payment_Time_Date"Payment_Time_Date"'])
            .from(Payment, 'pm')
            .innerJoin('pm.User_Id', 'user')
            .where("pm.User_Id = :id", { id: user_id })
            .getRawMany();

        if (data) {
            return res.status(200).json({ data });
        }


        return res.status(400).json({ message: 'Data does not exists' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//=======================Commision============================


/**
 * API to get a All Users Commision details (User_Profile, Wallet) full details admin
 */
router.get('/admin/commision', async (req, res) => {
    console.log('GET /api/admin/commision API call made');

    try {
        const connection = await DbUtils.getConnection();
        let data = await connection.getRepository(User_Profile).createQueryBuilder()
            .select(['DISTINCT user.User_Id"User_Id"', 'user.User_Name"Username"',
                'user.User_DisplayName"User_DisplayName"', 'w.User_Bouns_cash"User_Bouns_cash"'])
            .from(User_Profile, 'user')
            .innerJoin('user.Wallet_Id', 'w')
            //.take(10).skip(0)
            .where("w.User_Bouns_cash > :num", { num: 0 })
            .getRawMany();

        console.log("length: ", data.length);
        if (data.length > 0) {
            return res.status(200).json({ data });
        }
        return res.status(400).json({ message: 'Data not available' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
* API to post a All Users commision details by user_name (User_Profile, Wallet) full details
*/
router.post('/admin/commision', async (req, res) => {
    console.log('POST /api/admin/commision API call made');
    const { user_name } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        let data1 = await connection.getRepository(User_Profile).createQueryBuilder()
            .select(['DISTINCT user.User_Id"User_Id"', 'user.User_Name"Username"',
                'user.User_DisplayName"User_DisplayName"', 'w.User_Bouns_cash"User_Bouns_cash"'])
            .from(User_Profile, 'user')
            .innerJoin('user.Wallet_Id', 'w')
            .where("user.User_Name = :name", { name: user_name })
            .andWhere("w.User_Bouns_cash > :num", { num: 0 })
            .getRawOne();

        let data = [];
        data.push(data1);

        if (data) {
            return res.status(200).json({ data });
        }
        return res.status(400).json({ message: 'Data not available' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//=======================Dashboard============================

/**
 * API to get dashboard count
 */
router.get('/admin/dashboard', async (req, res) => {
    console.log('GET /api/admin/dashboard API call made');

    try {
        const connection = await DbUtils.getConnection();
        let [User, Usercount] = await connection.manager.findAndCount(User_Profile);
        let [game, Gamecount] = await connection.manager.findAndCount(Game);
        let [club, Clubcount] = await connection.manager.findAndCount(Club);
        let [payment, Paymentcount] = await connection.manager.findAndCount(Payment);
        let [admin, Admincount] = await connection.manager.findAndCount(Admin);
        let commision = await connection.getRepository(User_Profile).createQueryBuilder()
            .select(['DISTINCT user.User_Id"User_Id"', 'user.User_Name"Username"',
                'user.User_DisplayName"User_DisplayName"', 'w.User_Bouns_cash"User_Bouns_cash"'])
            .from(User_Profile, 'user')
            .innerJoin('user.Wallet_Id', 'w')
            //.take(10).skip(0)
            .where("w.User_Bouns_cash > :num", { num: 0 })
            .getRawMany();
        let commisioncount = commision.length;
        let data1 = { "User": Usercount, "Game": Gamecount, "Club": Clubcount, "Withdrawls": Paymentcount, "Admin": Admincount, "Commision": commisioncount };

        let data = [];
        data.push(data1);

        console.log("length: ", data);
        if (data) {
            return res.status(200).json({ data });
        }
        return res.status(400).json({ message: 'Data not available' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
//#endregion


//#region Gameplay

//=======================Registration & Login============================

/**
 * API to Create a new User (Registration)
 * Data Input Body
{
    "user_name":"ABC", "user_displayname":"ABC", "user_password":"qwer", "user_country":"India", "user_mob_no":7894561230, "user_email_id":"abc@gmail.com", "user_image":"Profile.png"
}
 */
router.post('/user/register', async (req, res) => {
    console.log('POST /api/user/register API call made');

    const { user_name, user_displayname, user_password, user_country, user_mob_no, user_email_id, user_image } = req.body;
    //#region null values check
    // if(user_name == null) {
    //     return res.status(400).json({ message: 'Username must be provide' });
    // }
    // else if(user_displayname == null) {
    //     return res.status(400).json({ message: 'Display Name must be provide' });
    // }
    // else if(user_password == null) {
    //     return res.status(400).json({ message: 'Password must be provide' });
    // }
    // else if(user_mob_no == null) {
    //     return res.status(400).json({ message: 'Mobile Number must be provide' });
    // }
    // else if(user_email_id == null) {
    //     return res.status(400).json({ message: 'Email must be provide' });
    // }
    //#endregion

    try {
        const connection = await DbUtils.getConnection();
        if (await connection.manager.findOne(User_Profile, { where: { User_Name: user_name } })) {
            return res.status(409).json({ message: 'The Username has been taken, please try another' });
        }
        else if (await connection.manager.findOne(User_Profile, { where: { User_Mobile_Number: user_mob_no } })) {
            return res.status(409).json({ message: 'The Mobile number has been taken, please try another' });
        }
        else if (await connection.manager.findOne(User_Profile, { where: { User_Email_Id: user_email_id } })) {
            return res.status(409).json({ message: 'The Email Id has been taken, please try another' });
        }

        let user = new User_Profile();
        let wallet = new Wallet();
        // wallet.User_Id = wallet.Wallet_Id;
        wallet.User_Chips = 10000;
        wallet.User_Bouns_cash = 0;
        wallet.User_Credit_Amount = 0;
        wallet.User_Debit_Amount = 0;
        wallet.User_Win_Amount = 0;
        wallet.User_Loss_Amount = 0;
        await connection.manager.save(wallet);

        //  console.log("waller userid: ", wallet);
        user.User_Id = wallet.Wallet_Id;
        user.User_Name = user_name;
        user.User_DisplayName = user_displayname;
        user.User_Password = Passwordhash.generate(user_password); //to convert password in hash 
        user.User_Country = user_country;
        user.User_Mobile_Number = user_mob_no;
        user.User_Email_Id = user_email_id;
        user.User_Image = user_image;
        user.User_Level = 1;
        user.Wallet_Id = wallet;
        await connection.manager.save(user);
        wallet.User_Id = user;
        await connection.manager.save(wallet);

        res.status(200).json({ message: 'User Registered successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * API to Verify a new User (login)
 */
router.post('/user/login', async (req, res) => {
    console.log('GET /api/user/login API call made');

    const { user_name, user_password } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        const loginuser = await connection.manager.findOne(User_Profile, { where: { User_Name: user_name } });
        if (loginuser && (Passwordhash.verify(user_password, loginuser.User_Password))) {
            return res.status(200).json({ message: 'User login successfully' });
        }
        return res.status(200).json({ message: 'Incorrect Username or Password' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//=======================User full detail============================

/**
 * API to get a All Users details (User_Profile, Wallet) full details admin
 */
// router.get('/users', async (req, res) => {
//     console.log('GET /api/users API call made');

//     try {
//         const connection = await DbUtils.getConnection();
//         let data = await connection.getRepository(User_Profile).createQueryBuilder()
//             .select(['DISTINCT user.User_Id"User_Id"', 'user.User_Name"Username"',
//                 'user.User_DisplayName"User_DisplayName"', 'user.User_Country"User_Country"',
//                 'user.User_Mobile_Number"User_Mobile_Number"', 'user.User_Email_Id"User_Email_Id"',
//          /*'user.User_Image"User_Image"', 'user.User_Level"User_Level"',
//          'w.User_Bouns_cash"User_Bouns_cash"',*/'w.User_Chips"User_Chips"',
//                 //   'w.User_Credit_Amount"User_Credit_Amount"','w.User_Debit_Amount"User_Debit_Amount"',
//                 'w.User_Win_Amount"User_Win_Amount"', 'w.User_Loss_Amount"User_Loss_Amount"'])
//             .from(User_Profile, 'user')
//             .innerJoin('user.Wallet_Id', 'w')
//             .getRawMany();

//         //console.log("all users:", data[0].User_Image.toString());
//         console.log("length: ", data.length);
//         if (data.length > 0) {
//             return res.status(200).json({ data });
//         }
//         return res.status(400).json({ message: 'Data not available' });
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// });

/**
* API to get a All Users details by user_name (User_Profile, Wallet) full details
*/
// router.post('/user', async (req, res) => {
//     console.log('POST /api/user API call made');
//     const { user_name } = req.body;

//     try {
//         const connection = await DbUtils.getConnection();
//         let data1 = await connection.getRepository(User_Profile).createQueryBuilder()
//             .select(['DISTINCT user.User_Id"User_Id"', 'user.User_Name"Username"',
//                 'user.User_DisplayName"User_DisplayName"', 'user.User_Country"User_Country"',
//                 'user.User_Mobile_Number"User_Mobile_Number"', 'user.User_Email_Id"User_Email_Id"',
//         /*'user.User_Image"User_Image"', 'user.User_Level"User_Level"',
//         'w.User_Bouns_cash"User_Bouns_cash"',*/'w.User_Chips"User_Chips"',
//                 //   'w.User_Credit_Amount"User_Credit_Amount"','w.User_Debit_Amount"User_Debit_Amount"',
//                 'w.User_Win_Amount"User_Win_Amount"', 'w.User_Loss_Amount"User_Loss_Amount"'])
//             .from(User_Profile, 'user')
//             .innerJoin('user.Wallet_Id', 'w')
//             .where("user.User_Name = :id", { id: /*req.params.*/user_name })
//             .getRawOne();

//         //console.log("all users:", data[0].User_Image.toString());

//         let data = [];
//         data.push(data1);
//         // console.log("-=-=-=-=>"+JSON.stringify(data));

//         if (data) {
//             return res.status(200).json({ data });
//         }
//         return res.status(400).json({ message: 'Data not available' });
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// });

/**
* Remove a User details from user_id
*/
// router.delete('/user', async (req, res) => {
//     console.log('DELETE /api/user API call made');
//     const { user_id } = req.body;

//     try {
//         const connection = await DbUtils.getConnection();
//         const exists = await connection.manager.findOne(User_Profile, { where: { User_Id: user_id } });
//         if (!exists) {
//             return res.status(409).json({ message: 'User is not exist' });
//         }
//         // await connection.manager.getRepository(User_Profile).remove(exists);
//         //delete wallet data
//         await connection.getRepository(Wallet).createQueryBuilder()
//             .delete()
//             .where("Wallet.Wallet_Id = :id", { id: user_id })
//             .execute();

//         //delete user data
//         let data = await connection.getRepository(User_Profile).createQueryBuilder()
//             .delete("")
//             .where("User_Profile.User_Id = :id", { id: user_id })
//             .execute();

//         // console.log("delete User: ", data);
//         res.status(200).json({ message: 'User deleted successfully' });
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// });


//=======================User Profile============================

/**
 * Update a User Profile from user_id
 */
router.put('/user/profile', async (req, res) => {
    console.log('PUT /api/user/profile API call made');

    const { user_id, user_displayname, user_password, user_country, user_image, user_level } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        const exists = await connection.manager.findOne(User_Profile, { where: { User_Id: user_id } });
        if (!exists) {
            return res.status(409).json({ message: 'User is not registered with us, please try another' });
        }

        const data = await connection.getRepository(User_Profile)
            .createQueryBuilder()
            .update(User_Profile)
            .set({
                User_DisplayName: user_displayname,
                User_Password: Passwordhash.generate(user_password), //to convert password in hash 
                User_Country: user_country,
                User_Image: user_image,
                User_Level: user_level
            })
            .where("User_Id = :id", { id: user_id })
            .execute();

        res.status(200).json({ message: 'User updated successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//=======================User for game============================

/**
 * API to get a All Users details (User_Profile, Wallet) for whole game page
 */
router.get('/users/detail', async (req, res) => {
    console.log('GET /api/users/detail API call made');

    try {
        const connection = await DbUtils.getConnection();
        let data = await connection.getRepository(User_Profile).createQueryBuilder()
            .select(['DISTINCT user.User_Id"User_Id"', 'user.User_Name"Username"',
                'user.User_DisplayName"User_DisplayName"', 'user.User_Country"User_Country"',
                'user.User_Image"User_Image"', 'user.User_Level"User_Level"', 'w.User_Chips"User_Chips"'])
            .from(User_Profile, 'user')
            .innerJoin('user.Wallet_Id', 'w')
            .getRawMany();

        //console.log("all users:", data[0].User_Image.toString());
        console.log("length: ", data.length);
        if (data.length > 0) {
            return res.status(200).json(data);
        }
        return res.status(400).json({ message: 'Data not available' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


/**
* API to get a All Users details by user_id (User_Profile, Wallet) for whole game page
*/
router.post('/user/detail', async (req, res) => {
    console.log('GET /api/user/detail API call made');
    const { user_id } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        let data = await connection.getRepository(User_Profile).createQueryBuilder()
            .select(['user.User_Id"User_Id"', 'user.User_Name"Username"',
                'user.User_DisplayName"User_DisplayName"', 'user.User_Country"User_Country"',
                'user.User_Image"User_Image"', 'user.User_Level"User_Level"', 'w.User_Chips"User_Chips"'])
            .from(User_Profile, 'user')
            .innerJoin('user.Wallet_Id', 'w')
            .where("user.User_Id = :id", { id: user_id })//.where("user.name = :name", { name: "Timber" })
            .getRawOne();

        //console.log("all users:", data[0].User_Image.toString());

        if (data) {
            return res.status(200).json(data);
        }
        return res.status(400).json({ message: 'Data not available' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});



//=======================Wallet============================

/**
* API to get a All Users Wallets
*/
router.get('/users/wallet', async (req, res) => {
    console.log('GET /api/users/wallet API call made');

    try {
        const connection = await DbUtils.getConnection();
        const [data, datacount] = await connection.manager.findAndCount(Wallet);
        console.log("all users:", datacount);
        if (datacount > 0) {
            console.log("users data....");
            return res.status(200).json(data);
        }
        return res.status(400).json({ message: 'data not available' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * API to get a Wallet from user_id (searching by id)
 */
router.post('/user/wallet', async (req, res) => {
    console.log('GET /api/user/wallet API call made');
    const { wallet_id } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        const data = await connection.manager.findOne(Wallet, { where: { Wallet_Id: wallet_id } });

        if (data) {

            return res.status(200).json(data);
        }

        return res.status(400).json({ message: 'Data does not exists' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * Update a Wallet from user_id
 */
router.put('/user/wallet', async (req, res) => {
    console.log('PUT /api/user/wallet API call made');

    const { user_id, user_bonus_cash, user_chips, user_credit_amount, user_debit_amount, user_win_amount, user_loss_amount } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        const exists = await connection.manager.findOne(Wallet, { where: { Wallet_Id: user_id } });
        if (!exists) {
            return res.status(409).json({ message: 'User is not registered with us, please try another' });
        }

        const data = await connection.getRepository(Wallet)
            .createQueryBuilder()
            .update(Wallet)
            .set({
                User_Bouns_cash: user_bonus_cash,
                User_Chips: user_chips,
                User_Credit_Amount: user_credit_amount,
                User_Debit_Amount: user_debit_amount,
                User_Win_Amount: user_win_amount,
                User_Loss_Amount: user_loss_amount
            })
            .where("Wallet_Id = :id", { id: user_id })
            .execute();

        res.status(200).json({ message: 'Data updated successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//=======================Game full============================

/**
 * API to Create a new Game with veriation
 * Data Input Body
{
    "game_name":"ABC","game_icon":"game.png","variation_name":"original", "variation_initial":"ORG", "variation_cards_count":3, "variation_deck":false, "variation_joker":false
}
 */
router.post('/game', async (req, res) => {
    console.log('POST /api/game API call made');

    const { game_name, game_icon, variation_name, variation_initial, variation_cards_count, variation_deck, variation_joker } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        if (await connection.manager.findOne(Game, { where: { Game_Name: game_name } })) {
            return res.status(409).json({ message: 'The Game Name has been taken, please try another' });
        }
        else if (await connection.manager.findOne(Variation, { where: { Variation_Name: variation_name } })) {
            return res.status(409).json({ message: 'The Variation Name has been taken, please try another' });
        }
        let variation = new Variation();
        variation.Variation_Name = variation_name;
        variation.Variation_Initial = variation_initial;
        variation.Variation_Cards_Count = variation_cards_count;
        variation.Variation_Deck = variation_deck;
        variation.Variation_Joker = variation_joker;

        let game = new Game();
        game.Game_Name = game_name;
        game.Game_Icon = game_icon;
        game.Game_Variation = [variation];
        await connection.manager.save(game);
        variation.Game_Id = game;
        await connection.manager.save(variation);

        res.status(200).json({ message: 'Game Added successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * API to get a All Games full
 */
router.get('/games/detail', async (req, res) => {
    console.log('GET /api/games/detail API call made');

    try {
        const connection = await DbUtils.getConnection();

        let data = await connection.getRepository(Variation).createQueryBuilder()
            .select(['DISTINCT game.Game_Id"Game_Id"', 'game.Game_Name"Game_Name"',
                'game.Game_Icon"Game_Icon"',
                'var.Variation_Name"Variation_Name"', 'var.Variation_Initial"Variation_Initial"',
                'var.Variation_Cards_Count"Variation_Cards_Count"', 'var.Variation_Deck"Variation_Deck"',
                'var.Variation_Joker"Variation_Joker"'])
            .from(Variation, 'var')
            .innerJoin('var.Game_Id', 'game')
            .getRawMany();

        // let data = await connection.getRepository(Game).find({relations: ["Game_Variation"]});

        console.log("all users:", data);
        console.log("length: ", data.length);
        if (data.length > 0) {
            return res.status(200).json(data);
        }
        return res.status(400).json({ message: 'Data not available' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * API to get a Game full from game_id (searching by id)
 */
router.post('/game/detail', async (req, res) => {
    console.log('GET /api/game/detail API call made');
    const { game_id } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        let data = await connection.getRepository(Variation).createQueryBuilder()
            .select(['DISTINCT game.Game_Id"Game_Id"', 'game.Game_Name"Game_Name"',
                'game.Game_Icon"Game_Icon"',
                'var.Variation_Name"Variation_Name"', 'var.Variation_Initial"Variation_Initial"',
                'var.Variation_Cards_Count"Variation_Cards_Count"', 'var.Variation_Deck"Variation_Deck"',
                'var.Variation_Joker"Variation_Joker"'])
            .from(Variation, 'var')
            .innerJoin('var.Game_Id', 'game')
            .where("var.Game_Id = :id", { id: game_id })
            .getRawMany();


        // let data = await connection.manager.find(Game, {relation: ['Game_Variation']});

        //console.log("all users:", data[0].User_Image.toString());
        console.log("length: ", data.length);
        if (data.length > 0) {
            return res.status(200).json(data);
        }

        return res.status(400).json({ message: 'Data does not exists' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * Update a Game from game_id
 */
router.put('/game', async (req, res) => {
    console.log('PUT /api/game API call made');

    const { game_id, game_name, game_icon } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        const exists = await connection.manager.findOne(Game, { where: { Game_Id: game_id } });
        if (!exists) {
            return res.status(409).json({ message: 'Game is not exist, please try another' });
        }

        const data = await connection.getRepository(Game)
            .createQueryBuilder()
            .update(Game)
            .set({
                Game_Name: game_name,
                Game_Icon: game_icon
            })
            .where("Game_Id = :id", { id: game_id })
            .execute();

        res.status(200).json({ message: 'Data updated successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * Remove a Game from game_id
 */
router.delete('/game', async (req, res) => {
    console.log('DELETE /api/game API call made');
    const { game_id } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        let exists = await connection.manager.findAndCount(Variation, { where: { Game_Id: game_id } });
        if (!exists) {
            return res.status(409).json({ message: 'Variation is not exist' });
        }
        console.log("delete Data1: ", exists);
        let data = await connection.getRepository(Variation).createQueryBuilder()
            .delete()
            .from(Variation)
            .where("Game_Id.Game_Id = :id", { id: game_id })
            .execute();

        // await connection.getRepository().remove(exists);
        exists = await connection.manager.findOne(Game, { where: { Game_Id: game_id } });
        if (!exists) {
            return res.status(409).json({ message: 'Game is not exist' });
        }
        console.log("delete Data2: ", exists);
        data = await connection.getRepository(Game).createQueryBuilder()
            .delete()
            .from(Game)
            .where("Game_Id = :id", { id: game_id })
            .execute();

        // await connection.getRepository().remove(exists);
        console.log("check delete Data: ", exists);
        res.status(200).json({ message: 'Game deleted successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//=======================Game only============================

/**
 * API to get a All Games Only Admin
 */
router.get('/games', async (req, res) => {
    console.log('GET /api/games API call made');

    try {
        const connection = await DbUtils.getConnection();
        // const data = await connection.manager.findAndCount(Game);
        const data = await connection.getRepository(Game)
            .createQueryBuilder()
            .select(['DISTINCT gm.Game_Id"Game_Id"', 'gm.Game_Name"Game_Name"'])
            .from(Game, 'gm')
            .getRawMany();

        console.log("all users:", data.length);
        if (data.length > 0) {
            // console.log("users data....");
            //const users = await connection.manager.find(User_Profile);
            return res.status(200).json(data);
        }
        return res.status(400).json({ message: 'data not available' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * API to get a Game Only from game_name (searching by name)
 */
router.post('/games', async (req, res) => {
    console.log('POST /api/games API call made');
    const { game_name } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        const data = await connection.getRepository(Game)
            .createQueryBuilder()
            .select(['DISTINCT gm.Game_Id"Game_Id"', 'gm.Game_Name"Game Name"'])
            .from(Game, 'gm')
            .where("gm.Game_Name = :name", { name: /*req.params.*/game_name })
            .getRawOne();
        // const data = await connection.manager.findOne(Game, { where: { Game_Id: game_id } });

        if (data) {
            return res.status(200).json({ data });
        }

        return res.status(400).json({ message: 'Data does not exists' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//=======================Variation============================

/**
 * API to Create a new Variation
 * Data Input Body
{
    "game_id":2, "Variation_Name":"var1", "Variation_Initial":"VAR", "Variation_Cards_Count":3, "Variation_Deck":false, "Variation_Joker":false
}
 */
router.post('/variation', async (req, res) => {
    console.log('POST /api/variation API call made');

    const { game_id, variation_name, variation_initial, variation_cards_count, variation_deck, variation_joker } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        if (await connection.manager.findOne(Variation, { where: { Variation_Name: variation_name } })) {
            return res.status(409).json({ message: 'The Variation Name has been taken, please try another' });
        }

        let variation = new Variation();
        variation.Game_Id = await connection.manager.findOne(Game, { where: { Game_Id: game_id } });
        variation.Variation_Name = variation_name;
        variation.Variation_Initial = variation_initial;
        variation.Variation_Cards_Count = variation_cards_count;
        variation.Variation_Deck = variation_deck;
        variation.Variation_Joker = variation_joker;
        await connection.manager.save(variation);

        res.status(200).json({ message: 'Variation Added successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * API to get a All Variation
 */
router.get('/variations', async (req, res) => {
    console.log('GET /api/variation API call made');

    try {
        const connection = await DbUtils.getConnection();
        const [data, datacount] = await connection.manager.findAndCount(Variation);
        console.log("all users:", datacount);
        if (datacount > 0) {
            // console.log("users data....");
            //const users = await connection.manager.find(User_Profile);
            return res.status(200).json(data);
        }
        return res.status(400).json({ message: 'data not available' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * API to get a Variation from variation_id (searching by id)
 */
router.get('/variation', async (req, res) => {
    console.log('GET /api/variation API call made');
    const { variation_id } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        const data = await connection.manager.findOne(Variation, { where: { Variation_Id: variation_id } });

        if (data) {

            return res.status(200).json(data);
        }

        return res.status(400).json({ message: 'Data does not exists' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * API to get a Variation from game_id (searching by id) admin
 */
router.post('/variation/game', async (req, res) => {
    console.log('GET /api/variation API call made');
    const { game_name } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        const game = await connection.manager.findOne(Game, { where: { Game_Name: game_name } });

        // console.log("game:" , game);
        const data1 = await connection.manager.findOne(Variation, { where: { Game_Id: game } });
        // console.log("game:" , data);
        if (data1) {
            let data = [];
            data.push(data1);
            return res.status(200).json({ data });
        }

        return res.status(400).json({ message: 'Data does not exists' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * Update a Variation from variation_id
 */
router.put('/variation', async (req, res) => {
    console.log('PUT /api/variation API call made');

    const { variation_id, variation_name, variation_initial, variation_cards_count, variation_deck, variation_joker } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        const exists = await connection.manager.findOne(Variation, { where: { Variation_Id: variation_id } });
        if (!exists) {
            return res.status(409).json({ message: 'Variation is not exist, please try another' });
        }

        const data = await connection.getRepository(Variation)
            .createQueryBuilder()
            .update(Variation)
            .set({
                Variation_Name: variation_name,
                Variation_Initial: variation_initial,
                Variation_Cards_Count: variation_cards_count,
                Variation_Deck: variation_deck,
                Variation_Joker: variation_joker
            })
            .where("Variation_Id = :id", { id: variation_id })
            .execute();

        res.status(200).json({ message: 'Data updated successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * Remove a Variation from variation_id
 */
router.delete('/variation', async (req, res) => {
    console.log('DELETE /api/variation API call made');
    const { variation_id } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        let exists = await connection.manager.findOne(Variation, { where: { Variation_Id: variation_id } });
        console.log("delete Data1: ", exists);
        if (!exists) {
            return res.status(409).json({ message: 'Variation is not exist' });
        }
        let data = await connection.getRepository(Variation).createQueryBuilder()
            .delete()
            .from(Variation)
            .where("Variation_Id = :id", { id: variation_id })
            .execute();

        // await connection.getRepository().remove(exists)
        // console.log("check delete Data: ", exists);
        res.status(200).json({ message: 'Variation deleted successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


//=======================Club============================

/**
 * API to Create a new Club
 * Data Input Body
{
    "club_name":"Demo", "club_initial":"DEM", "club_logo":"club.png", "club_money":2000, "club_notice":"it's notice", "club_owner_id":1, "club_member_id":2, "club_member_request_status":"Pending"
}
 */
router.post('/club', async (req, res) => {
    console.log('POST /api/club API call made');

    const { club_name, club_initial, club_logo, club_money, club_notice, club_owner_id, club_member_id, club_member_request_status } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        if (await connection.manager.findOne(Club, { where: { Club_Name: club_name } })) {
            return res.status(409).json({ message: 'The Club Name has been taken, please try another' });
        }

        let club = new Club();
        club.Club_Name = club_name;
        club.Club_Initial = club_initial;
        club.Club_Logo = club_logo;
        club.Club_Money = club_money;
        club.Club_Notice = club_notice;
        club.Club_owner_Id = await connection.manager.findOne(User_Profile, { where: { User_Id: club_owner_id } });
        club.Club_Member_Id = await connection.manager.findOne(User_Profile, { where: { User_Id: club_member_id } });
        club.Club_Member_Request_Status = club_member_request_status;
        await connection.manager.save(club);

        res.status(200).json({ message: 'Club Added successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * API to get a All Club
 */
router.get('/clubs', async (req, res) => {
    console.log('GET /api/clubs API call made');

    try {
        const connection = await DbUtils.getConnection();
        // const [data, datacount] = await connection.manager.findAndCount(Club);
        const [data, datacount] = await connection.manager.findAndCount(Club);
        // .select(['DISTINCT user.User_Id"User_Id"', 'user.User_Name"Username"',
        //  'user.User_DisplayName"User_DisplayName"', 'user.User_Country"User_Country"',
        //  'user.User_Mobile_Number"User_Mobile_Number"', 'user.User_Email_Id"User_Email_Id"',
        //  /*'user.User_Image"User_Image"', 'user.User_Level"User_Level"',
        //  'w.User_Bouns_cash"User_Bouns_cash"',*/'w.User_Chips"User_Chips"',
        // //   'w.User_Credit_Amount"User_Credit_Amount"','w.User_Debit_Amount"User_Debit_Amount"',
        //    'w.User_Win_Amount"User_Win_Amount"','w.User_Loss_Amount"User_Loss_Amount"'])
        // .from(Club, 'user')
        // .innerJoin('user.Wallet_Id', 'w')
        // .getRawMany();

        console.log("all users:", data.length);
        if (data.length > 0) {
            // console.log("users data....");
            //const users = await connection.manager.find(User_Profile);
            return res.status(200).json(data);
        }
        return res.status(400).json({ message: 'data not available' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * API to get a Club from club_id (searching by id)
 */
router.post('/club', async (req, res) => {
    console.log('GET /api/club API call made');
    const { club_id } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        const data = await connection.manager.findOne(Club, { where: { Club_Id: club_id } });

        if (data) {

            return res.status(200).json(data);
        }

        return res.status(400).json({ message: 'Data does not exists' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * Update a Club from club_id
 * * Data Input Body
{
    "club_id":1, "club_name":"Demo", "club_initial":"DEM", "club_logo":"club.png", "club_money":2000, "club_notice":"it's notice", "club_owner_id":1, "club_member_id":2, "club_member_request_status":"Pending"
}
 */
router.put('/club', async (req, res) => {
    console.log('PUT /api/club API call made');

    const { club_id, club_name, club_initial, club_logo, club_money, club_notice, club_owner_id, club_member_id, club_member_request_status } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        const exists = await connection.manager.findOne(Club, { where: { Club_Id: club_id } });
        if (!exists) {
            return res.status(409).json({ message: 'Club is not exist, please try another' });
        }

        const data = await connection.getRepository(Club)
            .createQueryBuilder()
            .update(Club)
            .set({
                Club_Name: club_name,
                Club_Initial: club_initial,
                Club_Logo: club_logo,
                Club_Money: club_money,
                Club_Notice: club_notice,
                Club_owner_Id: club_owner_id,
                Club_Member_Id: club_member_id,
                Club_Member_Request_Status: club_member_request_status


            })
            .where("Club_Id = :id", { id: club_id })
            .execute();

        res.status(200).json({ message: 'Data updated successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//#region Remove club
// /**
//  * Remove a Club with lobbies from club_id
//  */
//  router.delete('/club', async (req, res) => {
//     console.log('DELETE /api/club API call made');
//     const { club_id } = req.body;

//     try {
//         const connection = await DbUtils.getConnection();
//         let exists = await connection.manager.findOne(Club, { where: { Club_Id: club_id  } });
//         console.log("delete Data1: ", exists);
//         if(!exists) {
//             return res.status(409).json({ message: 'Club is not exist'});
//         }
//         let data = await connection.getRepository(Club).createQueryBuilder()
//         .delete()
//         .from(Club)
//         .where("Club_Id = :id", { id: club_id })
//         .execute();

//         // await connection.getRepository().remove(exists)
//         // console.log("check delete Data: ", exists);
//         res.status(200).json({ message: 'Club deleted successfully' });   
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// });
//#endregion

/**
 * Remove a Club with lobbies from club_id
 */
router.delete('/club', async (req, res) => {
    console.log('DELETE /api/club API call made');
    const { club_id } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        let exists = await connection.manager.findAndCount(Lobby, { where: { Lobby_Id: club_id } });
        if (!exists) {
            return res.status(409).json({ message: 'Lobby is not exist' });
        }
        console.log("delete Data1: ", exists);
        let data = await connection.getRepository(Lobby).createQueryBuilder()
            .delete()
            .from(Lobby)
            .where("Club_Id.Club_Id = :id", { id: club_id })
            .execute();

        // await connection.getRepository().remove(exists);
        exists = await connection.manager.findOne(Club, { where: { Club_Id: club_id } });
        if (!exists) {
            return res.status(409).json({ message: 'Club is not exist' });
        }
        console.log("delete Data2: ", exists);
        data = await connection.getRepository(Club).createQueryBuilder()
            .delete()
            .from(Club)
            .where("Club_Id = :id", { id: club_id })
            .execute();

        // await connection.getRepository().remove(exists);
        console.log("check delete Data: ", exists);
        res.status(200).json({ message: 'Club deleted successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//=======================club with Lobby============================

/**
 * API to get a All Clubs full
 */
router.get('/clubs/detail', async (req, res) => {
    console.log('GET /api/clubs/detail API call made');

    try {
        const connection = await DbUtils.getConnection();

        let data = await connection.getRepository(Lobby).createQueryBuilder()
            // .select(['DISTINCT game.Game_Id"Game_Id"', 'game.Game_Name"Game_Name"',
            //  'game.Game_Icon"Game_Icon"',
            //  'var.Variation_Name"Variation_Name"', 'var.Variation_Initial"Variation_Initial"',
            //  'var.Variation_Cards_Count"Variation_Cards_Count"', 'var.Variation_Deck"Variation_Deck"',
            //  'var.Variation_Joker"Variation_Joker"'])
            // .from(Variation, 'var')
            .innerJoinAndSelect('Lobby.Club_Id', 'club')
            .getRawMany();

        // let data = await connection.getRepository(Game).find({relations: ["Game_Variation"]});

        console.log("all users:", data);
        console.log("length: ", data.length);
        if (data.length > 0) {
            return res.status(200).json(data);
        }
        return res.status(400).json({ message: 'Data not available' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * API to get a Club full from club_id (searching by id)
 */
router.post('/club/detail', async (req, res) => {
    console.log('GET /api/club/detail API call made');
    const { club_id } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        let data = await connection.getRepository(Lobby).createQueryBuilder()
            // .select(['DISTINCT game.Game_Id"Game_Id"', 'game.Game_Name"Game_Name"',
            //  'game.Game_Icon"Game_Icon"',
            //  'var.Variation_Name"Variation_Name"', 'var.Variation_Initial"Variation_Initial"',
            //  'var.Variation_Cards_Count"Variation_Cards_Count"', 'var.Variation_Deck"Variation_Deck"',
            //  'var.Variation_Joker"Variation_Joker"'])
            // .from(Variation, 'var')
            .innerJoinAndSelect('Lobby.Club_Id', 'game')
            .where("Lobby.Club_Id = :id", { id: club_id })
            .getRawMany();


        // let data = await connection.manager.find(Game, {relation: ['Game_Variation']});

        //console.log("all users:", data[0].User_Image.toString());
        console.log("length: ", data.length);
        if (data.length > 0) {
            return res.status(200).json(data);
        }

        return res.status(400).json({ message: 'Data does not exists' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//=======================Lobby only============================

/**
 * API to Create a new Lobby
 * Data Input Body
{
    "club_id":1, "variation_id":2, "lobby_owner_id":1,"lobby_commision_rate":2,"lobby_name":"Test", "lobby_type":"ORG", "lobby_blinds":4, "lobby_total_persons":9, "lobby_join_players":4, "lobby_action_time":30, "lobby_boot_amount":500, "lobby_auto_start":false, "lobby_min_player_limit":2, "lobby_auto_extension":false, "lobby_time":"5:00", "lobby_pot_limit":50000, "lobby_min_bet":50, "lobby_max_bet":5000
}
 */
router.post('/lobby', async (req, res) => {
    console.log('POST /api/lobby API call made');

    const { club_id, variation_id, lobby_owner_id, lobby_commision_rate, lobby_name, lobby_type, lobby_blinds, lobby_total_persons, lobby_join_players, lobby_action_time, lobby_boot_amount, lobby_auto_start, lobby_min_player_limit, lobby_auto_extension, lobby_time, lobby_pot_limit, lobby_min_bet, lobby_max_bet } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        if (await connection.manager.findOne(Lobby, { where: { Lobby_Name: lobby_name } })) {
            return res.status(409).json({ message: 'The Lobby Name has been taken, please try another' });
        }

        let lobby = new Lobby();
        lobby.Club_Id = await connection.manager.findOne(Club, { where: { Club_Id: club_id } });
        lobby.Variation_Id = await connection.manager.findOne(Variation, { where: { Variation_Id: variation_id } });
        lobby.Lobby_Owner_Id = await connection.manager.findOne(User_Profile, { where: { User_Id: lobby_owner_id } });
        lobby.Lobby_Commision_Rate = lobby_commision_rate;
        lobby.Lobby_Name = lobby_name;
        lobby.Lobby_Type = lobby_type;
        lobby.Lobby_Blinds = lobby_blinds;
        lobby.Lobby_Total_Persons = lobby_total_persons;
        lobby.Lobby_Join_Players = lobby_join_players;
        lobby.Lobby_Action_Time = lobby_action_time;
        lobby.Lobby_Boot_Amount = lobby_boot_amount;
        lobby.Lobby_Auto_Start = lobby_auto_start;
        lobby.Lobby_Min_Player_Limit = lobby_min_player_limit;
        lobby.Lobby_Auto_Extension = lobby_auto_extension;
        lobby.Lobby_Time = lobby_time;
        lobby.Lobby_Pot_Limit = lobby_pot_limit;
        lobby.Lobby_Min_Bet = lobby_min_bet;
        lobby.Lobby_Max_Bet = lobby_max_bet;

        await connection.manager.save(lobby);

        res.status(200).json({ message: 'Lobby Added successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


/**
 * API to get a All Lobby
 */
router.get('/lobbies', async (req, res) => {
    console.log('GET /api/lobbies API call made');

    try {
        const connection = await DbUtils.getConnection();
        const [data, datacount] = await connection.manager.findAndCount(Lobby);
        console.log("all users:", datacount);
        if (datacount > 0) {
            // console.log("users data....");
            //const users = await connection.manager.find(User_Profile);
            return res.status(200).json(data);
        }
        return res.status(400).json({ message: 'data not available' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * API to get a Lobby from lobby_id (searching by id)
 */
router.post('/lobbys', async (req, res) => {
    console.log('GET /api/lobby API call made'+JSON.stringify(req.Body));
    const { lobby_id } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        const data = await connection.manager.findOne(Lobby, { where: { Lobby_Id: lobby_id } });

        if (data) {
            return res.status(200).json(data);
        }

        return res.status(400).json({ message: 'Data does not exists' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//=======================Lobby_History============================

/**
 * API to get a All Lobby_History
 */
router.get('/lobby_history', async (req, res) => {
    console.log('GET /api/lobby_history API call made');

    try {
        const connection = await DbUtils.getConnection();
        const [data, datacount] = await connection.manager.findAndCount(Lobby_History);
        console.log("all users:", datacount);
        if (datacount > 0) {
            // console.log("users data....");
            //const users = await connection.manager.find(User_Profile);
            return res.status(200).json(data);
        }
        return res.status(400).json({ message: 'data not available' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * API to get a Lobby_History from lobby_history_id (searching by id)
 */
router.get('/lobby_history/:lobby_history_id', async (req, res) => {
    console.log('GET /api/lobby_history/:lobby_history_id API call made');

    try {
        const connection = await DbUtils.getConnection();
        const data = await connection.manager.findOne(Lobby_History, { where: { Lobby_History_Id: req.params.lobby_history_id } });

        if (data) {
            return res.status(200).json(data);
        }
        return res.status(400).json({ message: 'Data does not exists' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//=======================Payment============================

/**
 * API to Create a new Payment
 * Data Input Body
{
    "user_id":7, "isdebitcredit":true, "payment_amount":3000
}
*/
router.post('/payment', async (req, res) => {
    console.log('POST /api/payment API call made');

    const { user_id, isdebitcredit, payment_amount } = req.body;

    try {
        const connection = await DbUtils.getConnection();

        let payment = new Payment();
        payment.User_Id = await connection.manager.findOne(User_Profile, { where: { User_Id: user_id } });
        payment.Is_DebitCredit = isdebitcredit;
        payment.Payment_Amount = payment_amount;
        await connection.manager.save(payment);

        let wallet_id = payment.User_Id.Wallet_Id;
        let wallet = await connection.manager.findOne(Wallet, { where: { User_Id: user_id } });
        wallet

        res.status(200).json({ message: 'Payment Created successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


/**
 * API to get a All Payment
 */
router.get('/payment', async (req, res) => {
    console.log('GET /api/payment API call made');

    try {
        const connection = await DbUtils.getConnection();
        const [data, datacount] = await connection.manager.findAndCount(Payment);
        console.log("all users:", datacount);
        if (datacount > 0) {
            // console.log("users data....");
            //const users = await connection.manager.find(User_Profile);
            return res.status(200).json(data);
        }
        return res.status(400).json({ message: 'data not available' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * API to get a Payment from user_id (searching by id)
 */
router.post('/payment', async (req, res) => {
    console.log('GET /api/payment API call made');
    const { user_id } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        const data = await connection.manager.findAndCount(Payment, { where: { User_Id: user_id } });

        if (data) {
            return res.status(200).json({ data });
        }


        return res.status(400).json({ message: 'Data does not exists' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


//#endregion


module.exports = router;