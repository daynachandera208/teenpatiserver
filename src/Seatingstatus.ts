export class Seatingstatus
{
    Session_id: string;
    Is_Playing: boolean;

    constructor()
    {
        this.Session_id = "-1";
        this.Is_Playing =false;
    }

    Setvalue(Session_id : string , Is_Playing : boolean)
    {
        this.Session_id = Session_id;
        this.Is_Playing = Is_Playing;
    }
}