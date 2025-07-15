import express from "express";

import { registerTrainee } from "../controllers/kachiJamesInitiativeTrainingController.js";

const traineeRouter = express.Router();

traineeRouter.post("/register", registerTrainee);

export default traineeRouter;