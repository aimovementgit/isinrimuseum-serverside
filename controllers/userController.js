import { sql } from "../config/db.js";

export const getUsers = async (req, res) => {
    const { id } = req.body;
    try {
        const users = await sql`
        SELECT * FROM users WHERE id=${id}
        `
        if(users.length === 0){
            return res.json({ success: false, message: "User not found" });
        }
        console.log(users)
        return res.json({ 
            success: true, 
            userData: {
                name: users[0].name,
                email: users[0].email,
                accountType: users[0].accounttype,
                isAccountVerified: users[0].isaccountverified,

            }
        });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
}