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
var Passwordhash = require('password-hash');


const router = express.Router();

//=======================Testing============================

/**
 * Test API for Checking if Server is up
 */
 router.get('/admin/',async (req, res) => {
    console.log(req.hostname);
    res.send(`The Server is up on ${req.hostname}!!`);
});

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

    const { user_name, user_displayname, user_password, user_country, user_mob_no, user_email_id, user_image} = req.body;
   
    try {
        const connection = await DbUtils.getConnection();
        if(await connection.manager.findOne(User_Profile, { where: { User_Name : user_name } })) {
            return res.status(409).json({ message: 'The Username has been taken, please try another'});
        }
        else if(await connection.manager.findOne(User_Profile, { where: { User_Mobile_Number :  user_mob_no } })) {
            return res.status(409).json({ message: 'The Mobile number has been taken, please try another'});
        }
        else if(await connection.manager.findOne(User_Profile, { where: { User_Email_Id : user_email_id } })) {
            return res.status(409).json({ message: 'The Email Id has been taken, please try another'});
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
         'user.User_Mobile_Number"User_Mobile_Number"', 'user.User_Email_Id"User_Email_Id"','w.User_Chips"User_Chips"',
           'w.User_Win_Amount"User_Win_Amount"','w.User_Loss_Amount"User_Loss_Amount"'])
        .from(User_Profile, 'user')
        .innerJoin('user.Wallet_Id', 'w')
        //.take(10).skip(0)
        .getRawMany();

        console.log("length: ", data.length);
        if (data.length > 0) {
            return res.status(200).json({data});
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
        'w.User_Chips"User_Chips"', 'w.User_Win_Amount"User_Win_Amount"','w.User_Loss_Amount"User_Loss_Amount"'])
        .from(User_Profile, 'user')
        .innerJoin('user.Wallet_Id', 'w')
        .where("user.User_Name = :name", { name: user_name})
        .getRawOne();

        let data = [];
        data.push(data1);

        if (data) {
            return res.status(200).json({data});
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
        const exists = await connection.manager.findOne(User_Profile, { where: { User_Id: user_id  } });
        if(!exists) {
            return res.status(409).json({ message: 'User is not exist'});
        }
        //delete wallet data
        await connection.getRepository(Wallet).createQueryBuilder()
        .delete()
        .where("Wallet.Wallet_Id = :id", { id: user_id  })
        .execute();

        //delete user data
        let data = await connection.getRepository(User_Profile).createQueryBuilder()
        .delete("")
        .where("User_Profile.User_Id = :id", { id: user_id  })
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
            return res.status(200).json({data});
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
        .where("gm.Game_Name = :name", { name: game_name})
        .getRawOne();

        let data = [];
        data.push(data1);

        if(data) {
            return res.status(200).json({data});
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
        const data1 = await connection.manager.findOne(Variation, { where: { Game_Id: game} });
        // console.log("game:" , data);
        if(data1) {
            let data = [];
            data.push(data1);
            return res.status(200).json({data});
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

    const {club_name, club_initial, club_logo, club_money, club_notice, club_owner_id, club_member_id, club_member_request_status } = req.body;
   
    try {
        const connection = await DbUtils.getConnection();
        if(await connection.manager.findOne(Club, { where: { Club_Name : club_name } })) {
            return res.status(409).json({ message: 'The Club Name has been taken, please try another'});
        }

        let club = new Club();
        club.Club_Name = club_name;
        club.Club_Initial = club_initial;
        club.Club_Logo = club_logo;
        club.Club_Money = club_money;
        club.Club_Notice = club_notice;
        club.Club_owner_Id = await connection.manager.findOne(User_Profile, { where: { User_Id : club_owner_id } });
        club.Club_Member_Id = await connection.manager.findOne(User_Profile, { where: { User_Id :  club_member_id} });
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
            return res.status(200).json({data});
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

        if(data) {
            
            return res.status(200).json({data});
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
        if(!exists) {
            return res.status(409).json({ message: 'Club is not exist, please try another'});
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
        let exists = await connection.manager.findAndCount(Lobby, { where: { Lobby_Id: club_id  } });
        if(!exists) {
            return res.status(409).json({ message: 'Lobby is not exist'});
        }
        console.log("delete Data1: ", exists);
        let data = await connection.getRepository(Lobby).createQueryBuilder()
        .delete()
        .from(Lobby)
        .where("Club_Id.Club_Id = :id", { id: club_id })
        .execute();

        // await connection.getRepository().remove(exists);
        exists = await connection.manager.findOne(Club, { where: { Club_Id: club_id  } });
        if(!exists) {
            return res.status(409).json({ message: 'Club is not exist'});
        }
        console.log("delete Data2: ", exists);
        data = await connection.getRepository(Club).createQueryBuilder()
        .delete()
        .from(Club)
        .where("Club_Id = :id", { id: club_id  })
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
    "club_id":1, "variation_id":2, "lobby_owner_id":1,"lobby_commision_rate":2,"lobby_name":"Test", "lobby_type":"ORG", "lobby_blinds":4, "lobby_total_persons":9, "lobby_join_players":4, "lobby_action_time":30, "lobby_boot_amount":500, "lobby_auto_start":false, "lobby_min_player_limit":2, "lobby_auto_extension":false, "lobby_time":"5:00", "lobby_pot_limit":50000, "lobby_min_bet":50, "lobby_max_bet":5000
}
 */
router.post('/admin/lobby', async (req, res) => {
    console.log('POST /api/admin/lobby API call made');

    const {  club_id, variation_id, lobby_owner_id, lobby_commision_rate, lobby_name, lobby_type, lobby_blinds, lobby_total_persons, lobby_join_players, lobby_action_time, lobby_boot_amount, lobby_auto_start, lobby_min_player_limit, lobby_auto_extension, lobby_time, lobby_pot_limit, lobby_min_bet, lobby_max_bet } = req.body;
   
    try {
        const connection = await DbUtils.getConnection();
        if(await connection.manager.findOne(Lobby, { where: { Lobby_Name : lobby_name } })) {
            return res.status(409).json({ message: 'The Lobby Name has been taken, please try another'});
        }

        let lobby = new Lobby();
        lobby.Club_Id = await connection.manager.findOne(Club, { where: { Club_Id : club_id } });
        lobby.Variation_Id = await connection.manager.findOne(Variation, { where: { Variation_Id : variation_id } });
        lobby.Lobby_Owner_Id = await connection.manager.findOne(User_Profile, { where: { User_Id : lobby_owner_id } });
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
 router.get('/admin/lobbies', async (req, res) => {
    console.log('GET /api/admin/lobbies API call made');

    try {
        const connection = await DbUtils.getConnection();
        const data = await connection.getRepository(Lobby).createQueryBuilder()
        .select(['DISTINCT lb.Lobby_Id"Lobby_Id"', 'club.Club_Name"Club_Name"',
        'var.Variation_Initial"Variation"','owner.User_Name"Owner_Name"',
         'lb.Lobby_Commision_Rate"Lobby_Commision_Rate"', 'lb.Lobby_Name"Lobby_Name"',
         'lb.Lobby_Blinds"Lobby_Blinds"', 'lb.Lobby_Total_Persons"Lobby_Total_Persons"',
         'lb.Lobby_Join_Players"Lobby_Join_Players"','lb.Lobby_Boot_Amount"Lobby_Boot_Amount"',
         'lb.Lobby_Min_Player_Limit"Lobby_Min_Player_Limit"','lb.Lobby_Time"Lobby_Time"',
         'lb.Lobby_Pot_Limit"Lobby_Pot_Limit"','lb.Lobby_Min_Bet"Lobby_Min_Bet"',
         'lb.Lobby_Max_Bet"Lobby_Max_Bet"'])
        .from(Lobby, 'lb')
        .innerJoin('lb.Club_Id', 'club')
        .innerJoin('lb.Variation_Id', 'var')
        .innerJoin('lb.User_Name', 'owner')
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
 router.post('/admin/lobby', async (req, res) => {
    console.log('POST /api/admin/lobby API call made');
    const { club_id } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        const data = await connection.getRepository(Lobby).createQueryBuilder()
        .select(['DISTINCT lb.Lobby_Id"Lobby_Id"', 'club.Club_Name"Club_Name"',
        'var.Variation_Initial"Variation"','owner.User_Name"Owner_Name"',
         'lb.Lobby_Commision_Rate"Lobby_Commision_Rate"', 'lb.Lobby_Name"Lobby_Name"',
         'lb.Lobby_Blinds"Lobby_Blinds"', 'lb.Lobby_Total_Persons"Lobby_Total_Persons"',
         'lb.Lobby_Join_Players"Lobby_Join_Players"','lb.Lobby_Boot_Amount"Lobby_Boot_Amount"',
         'lb.Lobby_Min_Player_Limit"Lobby_Min_Player_Limit"','lb.Lobby_Time"Lobby_Time"',
         'lb.Lobby_Pot_Limit"Lobby_Pot_Limit"','lb.Lobby_Min_Bet"Lobby_Min_Bet"',
         'lb.Lobby_Max_Bet"Lobby_Max_Bet"'])
        .from(Lobby, 'lb')
        .innerJoin('lb.Club_Id', 'club')
        .innerJoin('lb.Variation_Id', 'var')
        .innerJoin('lb.User_Name', 'owner')
        .where("lb.Club_Id = :id", { id: club_id })
        .getRawMany();

        if(data) {
            
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
 * API to get a Lobby_History from lobby_id (searching by id)
 */
 router.post('/admin/lobby_history', async (req, res) => {
    console.log('POST /api/admin/lobby_history API call made');
    const { lobby_id } = req.body;
    try {
        const connection = await DbUtils.getConnection();
        const data = await connection.getRepository(Lobby_History).createQueryBuilder()
        .select(['DISTINCT lbh.Lobby_History_Id"Lobby_History_Id"', 'lb.Lobby_Name"Lobby_Name"',
        'user.User_Name"User_Name"','lbh.Lobby_Status"Lobby_Status"',
        'lbh.User_Win_Status"User_Win_Status"', 'lbh.Amount"Amount"',
        'lbh.Round_Status"Round_Status"', 'lbh.User_Status"User_Status"',
         'lbh.Lobby_Round"Lobby_Round"','lbh.Total_Bet"Total_Bet"'])
        .from(Lobby_History, 'lbh')
        .innerJoin('lb.Lobby_Name', 'lb')
        .innerJoin('lb.User_Id', 'user')
        .where("lb.Lobby_Id = :id", { id: lobby_id })
        .getRawMany();
       
        if(data) {
            return res.status(200).json({data});
        }
        return res.status(400).json({ message: 'Data does not exists' });   
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//=======================Admin============================

/**
 * API to get a All Admin
 */
 router.get('/admins', async (req, res) => {
    console.log('GET /api/admins API call made');

    try {
        const connection = await DbUtils.getConnection();
        const data = await connection.manager.findAndCount(Admin);
        console.log("all users:", data.length);
        if (data.length > 0) {
            // console.log("users data....");
            //const users = await connection.manager.find(User_Profile);
            return res.status(200).json({data});
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
 router.post('/admin', async (req, res) => {
    console.log('POST /api/admin API call made');
    const { admin_name } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        const data = await connection.manager.findOne(Admin, { where: { Admin_Name: admin_name } });

        if(data) {
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
    "user_id":7, "isdebitcredit":"VAR", "payment_amount":3000
}
*/
router.post('/payment', async (req, res) => {
    console.log('POST /api/payment API call made');

    const { user_id, isdebitcredit, payment_amount } = req.body;
   
    try {
        const connection = await DbUtils.getConnection();

        let payment = new Payment();
        payment.User_Id = await connection.manager.findOne(User_Profile, { where: { User_Id : user_id } });
        payment.Is_DebitCredit = isdebitcredit;
        payment.Payment_Amount = payment_amount;
        await connection.manager.save(payment);

        let wallet_id = payment.User_Id.Wallet_Id;
        let wallet = await connection.manager.findOne(Wallet, { where: { User_Id : user_id } });
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
 router.get('/payment', async (req, res) => {
    console.log('GET /api/payment API call made');
    const { user_id } = req.body;

    try {
        const connection = await DbUtils.getConnection();
        const data = await connection.manager.findAndCount(Payment, { where: { User_Id: user_id } });

        if(data) {
            return res.status(200).json({data});
        }


        return res.status(400).json({ message: 'Data does not exists' });   
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;