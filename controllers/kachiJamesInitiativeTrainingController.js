import { sql } from "../config/db.js";
import { KACHI_JAMES_INITIATIVE_TRAINING_TEMPLATE } from "../config/EmailTemplate.js";
import transporter from "../config/nodemailer.js";

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone number validation (basic international format)
const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;

export const registerTrainee = async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            email,
            phone_number,
            date_of_birth,
            gender,
            country_of_origin,
            state_of_origin,
            local_government_area,
            address,
            highest_level_of_education,
            field_of_study,
            institution_name,
            graduation_year,
            employment_status,
            years_of_experience,
            job_title,
            company_name,
            preferred_training_track,
            training_mode,
            preferred_start_date,
            training_duration_preference,
            programming_languages,
            frameworks_and_technologies
        } = req.body;

        // Required fields validation
        const requiredFields = {
            first_name,
            last_name,
            email,
            phone_number,
            country_of_origin,
            state_of_origin,
            local_government_area,
            address,
            highest_level_of_education,
            employment_status,
            preferred_training_track,
            training_mode
        };

        const missingFields = Object.entries(requiredFields)
            .filter(([key, value]) => !value || value.toString().trim() === '')
            .map(([key]) => key.replace(/_/g, ' '));

        if (missingFields.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `The following required fields are missing: ${missingFields.join(', ')}` 
            });
        }

        // Validate email format
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                message: "Please provide a valid email address" 
            });
        }

        // Validate phone number format
        if (!phoneRegex.test(phone_number.replace(/[\s\-\(\)]/g, ''))) {
            return res.status(400).json({ 
                success: false, 
                message: "Please provide a valid phone number" 
            });
        }

        // Validate gender if provided
        const allowedGenders = ['male', 'female', 'other', 'prefer not to say'];
        if (gender && !allowedGenders.includes(gender.toLowerCase())) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid gender selection" 
            });
        }

        // Validate employment status
        const allowedEmploymentStatus = ['employed', 'unemployed', 'student', 'self-employed', 'freelancer'];
        if (!allowedEmploymentStatus.includes(employment_status.toLowerCase())) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid employment status" 
            });
        }

        // Validate training mode
        const allowedTrainingModes = ['online', 'offline', 'hybrid'];
        if (!allowedTrainingModes.includes(training_mode.toLowerCase())) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid training mode. Choose from: online, offline, hybrid" 
            });
        }

        // Validate date of birth if provided
        if (date_of_birth) {
            const birthDate = new Date(date_of_birth);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            
            if (age < 16 || age > 100) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Age must be between 16 and 100 years" 
                });
            }
        }

        // Validate graduation year if provided
        if (graduation_year) {
            const currentYear = new Date().getFullYear();
            if (graduation_year < 1950 || graduation_year > currentYear + 5) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Please provide a valid graduation year" 
                });
            }
        }

        // Check if user already exists
        const existingUser = await sql`
            SELECT id, email, first_name, last_name FROM trainingform 
            WHERE email = ${email.toLowerCase()}
        `;

        if (existingUser.length > 0) {
            return res.status(409).json({ 
                success: false, 
                message: "A registration with this email already exists" 
            });
        }

        // Process arrays for programming languages and frameworks
        const processedProgrammingLanguages = Array.isArray(programming_languages) 
            ? programming_languages.filter(lang => lang && lang.trim() !== '') 
            : [];
        
        const processedFrameworks = Array.isArray(frameworks_and_technologies) 
            ? frameworks_and_technologies.filter(tech => tech && tech.trim() !== '') 
            : [];

        // Create new training registration
        const newRegistration = await sql`
            INSERT INTO trainingform (
                first_name, last_name, email, phone_number, date_of_birth, gender,
                country_of_origin, state_of_origin, local_government_area, address,
                highest_level_of_education, field_of_study, institution_name, graduation_year,
                employment_status, years_of_experience, job_title, company_name,
                preferred_training_track, training_mode, preferred_start_date,
                training_duration_preference, programming_languages, frameworks_and_technologies,
                created_at
            )
            VALUES (
                ${first_name.trim()}, ${last_name.trim()}, ${email.toLowerCase()}, ${phone_number.trim()},
                ${date_of_birth || null}, ${gender ? gender.toLowerCase() : null},
                ${country_of_origin.trim()}, ${state_of_origin.trim()}, ${local_government_area.trim()}, ${address.trim()},
                ${highest_level_of_education.trim()}, ${field_of_study?.trim() || null}, ${institution_name?.trim() || null}, ${graduation_year || null},
                ${employment_status.toLowerCase()}, ${years_of_experience?.trim() || null}, ${job_title?.trim() || null}, ${company_name?.trim() || null},
                ${preferred_training_track.trim()}, ${training_mode.toLowerCase()}, ${preferred_start_date || null},
                ${training_duration_preference?.trim() || null}, ${processedProgrammingLanguages}, ${processedFrameworks},
                NOW()
            )
            RETURNING id, first_name, last_name, email, preferred_training_track, training_mode, created_at
        `;

        if (!newRegistration || newRegistration.length === 0) {
            throw new Error("Failed to create training registration");
        }

        const registration = newRegistration[0];
        console.log("New training registration:", { 
            id: registration.id, 
            email: registration.email, 
            name: `${registration.first_name} ${registration.last_name}`,
            training_track: registration.preferred_training_track 
        });

        // Prepare email template with registration data
        const fullName = `${registration.first_name} ${registration.last_name}`;
        const emailTemplate = KACHI_JAMES_INITIATIVE_TRAINING_TEMPLATE
            .replace(/{{name}}/g, fullName)
            .replace(/{{first_name}}/g, registration.first_name)
            .replace(/{{last_name}}/g, registration.last_name)
            .replace(/{{email}}/g, registration.email)
            .replace(/{{training_track}}/g, registration.preferred_training_track)
            .replace(/{{training_mode}}/g, registration.training_mode)
            .replace(/{{registration_date}}/g, new Date(registration.created_at).toLocaleDateString())
            .replace(/{{registration_id}}/g, registration.id);

        // Send welcome/confirmation email
        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: registration.email,
            subject: "Registration Confirmed - Kachi James Initiative Training Program",
            html: emailTemplate,
            text: `Dear ${fullName}, Thank you for registering for the Kachi James Initiative Training Program. Your registration for ${registration.preferred_training_track} has been confirmed.`
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log("Registration confirmation email sent successfully to:", registration.email);
        } catch (emailError) {
            console.error("Failed to send confirmation email:", emailError);
            // Don't fail the registration if email fails
        }

        // Return success response
        return res.status(201).json({ 
            success: true, 
            message: "Training registration completed successfully! Confirmation email has been sent.",
            registration: {
                id: registration.id,
                name: fullName,
                email: registration.email,
                training_track: registration.preferred_training_track,
                training_mode: registration.training_mode,
                registration_date: registration.created_at
            }
        });

    } catch (error) {
        console.error("Registration error:", error);
        
        // Handle specific database errors
        if (error.code === '23505') { // PostgreSQL unique violation
            return res.status(409).json({ 
                success: false, 
                message: "A registration with this email already exists" 
            });
        }

        if (error.code === '22007') { // PostgreSQL invalid datetime format
            return res.status(400).json({ 
                success: false, 
                message: "Invalid date format provided" 
            });
        }

        return res.status(500).json({ 
            success: false, 
            message: "Registration failed. Please try again later." 
        });
    }
};

// Check if user already exists
export const checkUserExists = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                message: "Valid email is required" 
            });
        }

        const existingUser = await sql`
            SELECT id, first_name, last_name, email, created_at FROM trainingform 
            WHERE email = ${email.toLowerCase()}
        `;

        if (existingUser.length > 0) {
            const user = existingUser[0];
            return res.status(200).json({ 
                success: true, 
                exists: true,
                user: {
                    name: `${user.first_name} ${user.last_name}`,
                    email: user.email,
                    registration_date: user.created_at
                }
            });
        }

        return res.status(200).json({ 
            success: true, 
            exists: false 
        });

    } catch (error) {
        console.error("Check user error:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Failed to check user existence" 
        });
    }
};

// Get registration statistics (bonus function)
export const getRegistrationStats = async (req, res) => {
    try {
        const stats = await sql`
            SELECT 
                COUNT(*) as total_registrations,
                COUNT(CASE WHEN training_mode = 'online' THEN 1 END) as online_registrations,
                COUNT(CASE WHEN training_mode = 'offline' THEN 1 END) as offline_registrations,
                COUNT(CASE WHEN training_mode = 'hybrid' THEN 1 END) as hybrid_registrations,
                COUNT(CASE WHEN employment_status = 'employed' THEN 1 END) as employed_participants,
                COUNT(CASE WHEN employment_status = 'unemployed' THEN 1 END) as unemployed_participants,
                COUNT(CASE WHEN employment_status = 'student' THEN 1 END) as student_participants
            FROM trainingform
        `;

        const trackStats = await sql`
            SELECT preferred_training_track, COUNT(*) as count
            FROM trainingform
            GROUP BY preferred_training_track
            ORDER BY count DESC
        `;

        return res.status(200).json({
            success: true,
            stats: stats[0],
            training_tracks: trackStats
        });

    } catch (error) {
        console.error("Stats error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch registration statistics"
        });
    }
};