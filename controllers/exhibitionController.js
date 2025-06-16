import { sql } from "../config/db.js";

export const getAllExhibitions = async (req, res) => {
    try {
        const exhibition = await sql`SELECT * FROM exhibition`;

        console.log("fetched allExhibitions", exhibition)
        res.status(200).json({ success: true, data: exhibition })

    } catch (error) {
        console.log("error in getAllExhibitions function")
        res.status(500).json({ success: false, message: "Internal server err", error })
    }
}

export const createExhibition = async (req, res) => {
    const { featuredimage, title, description, start_time, end_time, exhibition_date, phonenumber, photo1, photo2, photo3, photo4, location } = req.body

    // Only validate required fields
    if (!title || !start_time || !featuredimage || !description || !end_time || !exhibition_date || !phonenumber || !location) {
        return res.status(400).json({ success: false, message: "Required fields: title, start_time, featuredimage, description, end_time, exhibition_date, phonenumber, location" })
    }
    
    try {
        const addExhibition = await sql`
        INSERT INTO exhibition (featuredimage, title, description, start_time, end_time, exhibition_date, phonenumber, photo1, photo2, photo3, photo4, location)
        VALUES (${featuredimage}, ${title}, ${description}, ${start_time}, ${end_time}, ${exhibition_date}, ${phonenumber}, ${photo1 || null}, ${photo2 || null}, ${photo3 || null}, ${photo4 || null}, ${location})
        RETURNING *
        `
        console.log("New exhibition created successfully ", addExhibition)

        res.status(201).json({ success: true, data: addExhibition[0] })
    } catch (error) {
        console.log(`Error in createExhibition function: ${error}`)
        res.status(500).json({ success: false, message: `Error in createExhibition function: Internal server err - ${error}`})
    }
};
export const getExhibition = async (req, res) => {
    const { id } = req.params

    // Validate that id exists and is a valid number
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ 
            success: false, 
            message: "Invalid or missing exhibition ID" 
        });
    }

    try {
        const exhibitionId = parseInt(id);
        const getArtExhibition = await sql`
        SELECT * FROM exhibition WHERE id=${exhibitionId}
        `;

        if (getArtExhibition.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Exhibition not found" 
            });
        }

        res.status(200).json({ success: true, data: getArtExhibition[0] });
    } catch (error) {
        console.log("Error in getArtExhibition function", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error",
            error: error.message 
        });
    }
};

export const updateExhibition = async (req, res) => {
    const { id } = req.params;
    const { featuredimage, title, description, start_time, end_time, exhibition_date, phonenumber, photo1, photo2, photo3, photo4, location } = req.body

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ 
            success: false, 
            message: "Invalid or missing exhibition ID" 
        });
    }

    try {
        const exhibitionId = parseInt(id);
        
        const updateArtExhibition = await sql`
        UPDATE exhibition 
        SET featuredimage = ${featuredimage}, 
            title = ${title}, 
            description = ${description},
            start_time = ${start_time},
            end_time = ${end_time},
            exhibition_date = ${exhibition_date},
            phonenumber = ${phonenumber},
            photo1 = ${photo1},
            photo2 = ${photo2},
            photo3 = ${photo3},
            photo4 = ${photo4},
            location = ${location}
        WHERE id = ${exhibitionId}
        RETURNING *
        `

        if (updateArtExhibition.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Exhibition not found",
            });
        }

        res.status(200).json({ success: true, data: updateArtExhibition[0] });
    } catch (error) {
        console.log("Error in updateArtExhibition function", error);
        res.status(500).json({ success: false, message: error.message })
    }
};

export const deleteExhibition = async (req, res) => {
    const { id } = req.params
    try {
        const deleteArtExhibition = await sql`
        DELETE FROM exhibition WHERE id=${id} RETURNING *
        `
        if (deleteArtExhibition.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Exhibition not found",
            });
        }


        res.status(200).json({ success: true, data: deleteArtExhibition[0] });
    } catch (error) {
        console.log("Error in deleteExhibition function", error);
        res.status(500).json({ success: false, message: "Internal server err" })
    }
};

