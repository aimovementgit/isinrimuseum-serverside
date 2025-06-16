import express from "express";

import { 
    getAllExhibitions,
    createExhibition,
    getExhibition,
    updateExhibition,
    deleteExhibition

 } from "../controllers/exhibitionController.js";

 const exhibitionRouter = express.Router();

 exhibitionRouter.get("/all-exhibitions", getAllExhibitions);
 exhibitionRouter.post("/create-exhibition", createExhibition);
 exhibitionRouter.get("/get-exhibition/:id", getExhibition);
 exhibitionRouter.put("/update-exhibition/:id", updateExhibition);
 exhibitionRouter.delete("/delete-exhibition/:id", deleteExhibition);

 export default exhibitionRouter;