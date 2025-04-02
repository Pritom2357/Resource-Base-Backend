import pool from "../config/db.js";
import {v4 as uuidv4} from 'uuid';

export async function subscribeToNewsletter(req, res) {
    const {email} = req.body;

    if(!email){
        return res.status(400).json({
            error: "Email is required"
        });
    }

    try {
        const emailCheckQuery = 'SELECT * FROM newsletter_subscribers WHERE email = $1';
        const emailCheckResult = await pool.query(emailCheckQuery, [email]);

        if(emailCheckResult.rows.length > 0){
            return res.status(409).json({
                error: "Email already subscribed"
            });
        }

        const id = uuidv4();
        const query = 'INSERT INTO newsletter_subscribers (id, email) VALUES ($1, $2) RETURNING *';
        const result = await pool.query(query, [id, email]);

        res.status(201).json({
            success: true,
            message: "Successfully subscribed to newsletter",
            subscriber: {
                id: result.rows[0].id,
                email: result.rows[0].email,
                subscribed_at: result.rows[0].subscribed_at
            }
        });
    } catch (error) {
        console.error('Newsletter subscription error:', error);
        res.status(500).json({
        error: 'Failed to subscribe to newsletter',
        message: error.message
        });
    }
}

// need admin request for this, did not configure

export async function getSubscribers(req, res) {
    try {
        if(!req.user || !req.user.isAdmin){
            return res.status(403).json({
                error: 'Unauthorized access'
            });
        }

        const query = 'SELECT * FROM newsletter_subscribers WHERE is_active = true ORDER BY subscribed_at DESC';
        const result = await pool.query(query);

        res.json({
            subscribers: result.rows
        });
    } catch (error) {
        console.error('Get subscribers error:', error);
        res.status(500).json({
        error: 'Failed to retrieve subscribers',
        message: error.message
        });
    }
}