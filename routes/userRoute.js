import express from "express";
import userAuth from "../middleware/userAuth.js";
import { getUsers } from "../controllers/userController.js";

const userRouter = express.Router();

userRouter.get("/data", userAuth, getUsers);

export default userRouter;