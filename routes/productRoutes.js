import express from "express";
import {
    createProduct,
    getProducts,
    getProduct,
    deleteProduct,
    updateProducts
} from "../controllers/productController.js";

const router = express.Router();

router.get("/", getProducts);
router.get("/:id", getProduct);
router.post("/", createProduct);
router.put("/:id", updateProducts);
router.delete("/:id", deleteProduct);

export default router;