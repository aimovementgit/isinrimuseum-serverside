import { sql } from "../config/db.js";

export const getAllGallery = async (req, res) => {
    try {
        const gallery = await sql`SELECT * FROM gallery`;

        console.log("fetched allGellery", gallery)
        res.status(200).json({ success: true, data: gallery })

    } catch (error) {
        console.log("error in getAllGallery function")
        res.status(500).json({ success: false, message: "Internal server err", error })
    }
}

export const createGellery = async (req, res) => {
    const { name, price, featuredimage, description, artist, yearcollected } = req.body

    if (!name || !price || !featuredimage || !description || !artist || !yearcollected ) {
        return res.status(400).json({ success: false, message: "all fields are required" })
    }
    try {
        const newGellery = await sql`
        INSERT INTO gallery (name, price, featuredimage, description, artist, yearcollected )
        VALUES (${name},${price},${featuredimage},${description},${artist},${yearcollected})
        RETURNING *
        `
        console.log("new art added in the gellery ", newGellery)

        res.status(201).json({ success: true, data: newGellery[0] })
    } catch (error) {
        console.log(`Error in creatGellery function: ${error}`)
        res.status(500).json({ success: false, message: `"Error in creatGellery function: Internal server err" ${error}`})
    }
};


export const getGalleryArtWork = async (req, res) => {
    const { id } = req.params

    // Validate that id exists and is a valid number
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ 
            success: false, 
            message: "Invalid or missing artwork ID" 
        });
    }

    try {
        const artworkId = parseInt(id);
        const getArtwork = await sql`
        SELECT * FROM gallery WHERE id=${artworkId}
        `;

        if (getArtwork.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Artwork not found" 
            });
        }

        res.status(200).json({ success: true, data: getArtwork[0] });
    } catch (error) {
        console.log("Error in getArtwork function", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error",
            error: error.message 
        });
    }
};

export const updateGalleryArtWork = async (req, res) => {
    const { id } = req.params;
    const { name, price, featuredimage, description, artist, yearcollected } = req.body

    try {
        const updateArtWork = await sql`
        UPDATE gallery 
        SET name=${name}, 
        price=${price}, 
        featuredimage=${featuredimage}, 
        description=${description},
        artist=${artist},
        yearcollected=${yearcollected}
        WHERE id=${id}
        RETURNING *
        `

        if (updateArtWork.length === 0) {
            return res.status(404).json({
                success: false,
                message: "ArtWork not found",
            });
        }

        res.status(200).json({ success: true, date: updateArtWork[0] });
    } catch (error) {
        console.log("Erroe in updateProduct function", error);
        res.status(500).json({ success: false, message: error })
    }
};

export const deleteGalleryArtWork = async (req, res) => {
    const { id } = req.params
    try {
        const deleteArtWork = await sql`
        DELETE FROM gallery WHERE id=${id} RETURNING *
        `
        if (deleteArtWork.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Art work not found",
            });
        }


        res.status(200).json({ success: true, date: deleteArtWork[0] });
    } catch (error) {
        console.log("Erroe in deleteArtWork function", error);
        res.status(500).json({ success: false, message: "Internal server err" })
    }
};

