import jwt from "jsonwebtoken";

const userAuth = async (req, res, next) => {
    const {token} = req.cookies;

    if (!token) {
        return res.json({ success: false, message: "Unauthorized Login Again " });
        console.log("Unauthorized Login Again 111");
    }

    try {
        
        const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);

        if(tokenDecode.id){
            req.body.id = tokenDecode.id;
        } else {
            return res.json({ success: false, message: "Unauthorized Login Again " });
        }
        next();

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
}

export default userAuth;