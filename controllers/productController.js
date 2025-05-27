import { sql } from "../config/db.js"

export const getProducts = async (req, res) => {
    try {
        const products = await sql`
    SELECT * FROM products ORDER BY created_at DESC
    `;

        //console.log("fetched products", products)
        res.status(200).json({ success: true, data: products })
    } catch (error) {
        console.log("error in getProduct function")
        res.status(500).json({ success: false, message: "Internal server err", error })
    }
};

export const createProduct = async (req, res) => {
    const { name, price, categories, quantity, featuredimage, images1, images2, images3, images4, description, instock, additionalinfo } = req.body

    if (!name || !price || !categories || quantity || !featuredimage || !images1 || !images2 || !images3 || !images4 || !description, !instock, !additionalinfo) {
        return res.status(400).json({ success: false, message: "all fields are required" })
    }
    try {
        const newProduct = await sql`
        INSERT INTO products (name, price, categories, quantity, featuredimage, images1, images2, images3, images4, description, additionalinfo, instock)
        VALUES (${name},${price},${categories},${quantity},${featuredimage},${images1},${images2},${images3},${images4},${description},${additionalinfo}, ${instock})
        RETURNING *
        `
        //console.log("new product added", newProduct)

        res.status(201).json({ success: true, data: newProduct[0] })
    } catch (error) {
        console.log(`Error in createProduct function: ${error}`)
        res.status(500).json({ success: false, message: "Error in createProduct function: Internal server err" })
    }
};

export const getProduct = async (req, res) => {
    const { id } = req.params

    try {
        const product = await sql`
        SELECT * FROM products WHERE id=${id}
        `;

        res.status(200).json({ success: true, date: product[0] });
    } catch (error) {
        console.log("Erroe in getProduct function", error);
        res.status(500).json({ success: false, message: error })

    }
};

export const updateProducts = async (req, res) => {
    const { id } = req.params;
    const { name, price, categories, quantity, featuredimage, images1, images2, images3, images4, description, instock, additionalinfo } = req.body

    try {
        const updateProduct = await sql`
        UPDATE products 
        SET name=${name}, 
        quantity=${quantity},
        price=${price}, 
        categories=${categories},
        featuredimage=${featuredimage}, 
        images1=${images1}, 
        images2=${images2},
        images3=${images3},
        images4=${images4},
        description=${description},
        instock=${instock},
        additionalinfo=${additionalinfo}
        WHERE id=${id}
        RETURNING *
        `

        if (updateProduct.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        res.status(200).json({ success: true, date: updateProduct[0] });
    } catch (error) {
        console.log("Erroe in updateProduct function", error);
        res.status(500).json({ success: false, message: "Internal server err" })
    }
};

export const deleteProduct = async (req, res) => {
    const { id } = req.params
    try {
        const deleteProduct = await sql`
        DELETE FROM products WHERE id=${id} RETURNING *
        `
        if (deleteProduct.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }


        res.status(200).json({ success: true, date: deleteProduct[0] });
    } catch (error) {
        console.log("Erroe in deleteProduct function", error);
        res.status(500).json({ success: false, message: "Internal server err" })
    }
};