import express from "express";

import {
    getAllGallery,
    createGellery,
    getGalleryArtWork,
    updateGalleryArtWork,
    deleteGalleryArtWork,

} from "../controllers/galleryController.js";

const gelleryRouter = express.Router();

gelleryRouter.get("/all-gallery-work", getAllGallery);
gelleryRouter.post("/create-gellery-work", createGellery);
gelleryRouter.get("/get-gallery-work/:id", getGalleryArtWork);
gelleryRouter.put("/update-gallery-work/:id", updateGalleryArtWork);
gelleryRouter.delete("/delete-gallery-work/:id", deleteGalleryArtWork);

export default gelleryRouter;