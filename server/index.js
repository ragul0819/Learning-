import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { google } from "googleapis";
import { authenticateToken } from "./utilites.js";
import User from "./models/user.model.js";
import Note from "./models/note.model.js";
import { OAuth2Client } from 'google-auth-library';
import cron from 'node-cron';
import rateLimiter from 'express-rate-limit';
import helmet from 'helmet'

dotenv.config();

// Connect to MongoDB
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected...');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

connectDB();

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors({ origin: "*" }));

// Apply rate limiting 
const limiter = rateLimiter({ 
    windowMs: 15 * 60 * 1000, // 15 minutes 
    max: 100 // Limit each IP to 100 requests per windowMs 
}); 

app.use(limiter);
app.use(helmet());

app.get("/", (req, res) => {
    res.json({ data: "Hello" });
});

    // Create Account
    app.post("/create-account", async (req, res) => {
        const { fullName, email, password } = req.body;

        try {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ 
                    error: true, 
                    message: "User already exists" 
                });
            }

            // Save user with OTP and verified flag to the database
            const user = new User({ 
                fullName, 
                email, 
                password, 
            });

            await user.save();
        } catch (error) {
            console.error("Error creating user:", error);
            res.status(500).json({ 
                error: true, 
                message: "Error creating user" 
            });
        }
    });


    // Login Account
    app.post("/login", async (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                message: "Email and Password are required" 
            });
        }

        const userInfo = await User.findOne({ email });

        if (!userInfo) {
            return res.status(400).json({ 
                message: "User not found or not verified" 
            });
        }

        if (userInfo.password === password) {
            const user = { user: userInfo };

            const accessToken = jwt.sign(
                user, 
                process.env.ACCESS_TOKEN_SECRET, 
                { expiresIn: "36000m" } // This seems quite long; consider a more secure duration
            );

            return res.json({
                error: false,
                message: "Login Successful",
                email,
                accessToken,
            });
        } else {
            return res.status(400).json({
                error: true,
                message: "Invalid Credentials",
            });
        }
    });

// Get User

app.get("/get-user", authenticateToken, async (req, res) => {
    const { user } = req.user;
    if (!user) {
        return res.sendStatus(401);
    }

    console.log('User from token:', user);

    try {
        const isUser = await User.findOne({ _id: user._id });
        if (!isUser) {
            return res.status(404).json({ 
                error: true, 
                message: "User not found" 
            });
        }

        console.log('User found in DB:', isUser);

        return res.json({
            user: {
                fullName: isUser.fullName,
                email: isUser.email,
                _id: isUser._id,
                createdOn: isUser.createdOn,
            },
            message: ""
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        return res.status(500).json({ error: true, message: 'Internal server error' });
    }
});

// Add Notes

app.post("/add-note", authenticateToken, async (req, res) => {
    
    const { title, content, tags } = req.body;
    const { user } = req.user;

    console.log(req.user);

    console.log(title);
    console.log(content);
    console.log(user);
    console.log(user._id);

    if (!title) {
        return res 
            .status(400)
            .json({
                error : true,
                message : "Title is required"
            });
    }

    if (!content) {
        return res
            .status(400)
            .json({
                error : true,
                message : "Content is required"
            })
    }

    try {
        const note = new Note({
            title,
            content,
            tags : tags || [],
            userId : user._id,
        });

        await note.save();
        console.log('Note saved:', note);

        return res.json({
            error : false,
            note,
            message : "Note added successfully"
        });

    } catch (error) {
        return res
            .status(500)
            .json({
                error : true,
                message : "Internal Server Error",
            });
    }
});

// Edit Note

app.put("/edit-note/:noteId", authenticateToken, async (req, res) => {
    const noteId = req.params.noteId;
    const { title, content, tags, isPinnned } = req.body;
    const { user } = req.user;

    if (!title && !content && !tags) {
        return res 
            .status(400)
            .json({
                error : true, 
                message : "No changes provided"
            });
    }

    try {
        const note = await Note.findOne({ _id : noteId, userId : user._id });

        if (!note) {
            return res
                .status(404)
                .json({
                    error : true,
                    message : "Note not found"
                });
        }

        if (title) note.title = title;
        if (content) note.content = content;
        if (tags) note.tags = tags;
        if (isPinnned) note.isPinned = isPinnned;

        await note.save();
        console.log('Note Updated:', note);

        return res.json({
            error : false,
            note,
            message : "Note updated successfully"
        });

    } catch (error) {
        return res
            .status(500)
            .json({
                error : true,
                message : "Internal Server Error"
            });
    }
});

// Get All Notes

app.get("/get-all-notes/", authenticateToken, async (req, res) => {

    const { user } = req.user;

    try {
        
        const notes = await Note.find({ userId : user._id }).sort({ isPinned : -1 });

        return res.json({
            error : false,
            notes,
            message : "All notes retrieved successfully"
        });
        
    } catch (error) {
        return res
            .status(500)
            .json({
                error : true,
                message : "Internal Server Error"
            });
    }
});

// Delete Note

app.delete("/delete-note/:noteId", authenticateToken, async (req, res) => {
    const noteId = req.params.noteId;
    const { user } = req.user;

    try {

        const note = await Note.findOne({ _id : noteId, userId : user._id });

        if (!note) {
            return res
                .status(404)
                .json({
                    error : true,
                    message : "Note not found"
                });
        }

        await Note.deleteOne({ _id : noteId, userId : user._id });

        return res.json({
            error : false,
            message : "Note deleted successfully"
        });

    } catch (error) {
        return res
            .status(500)
            .json({
                error : true,
                message : "Internal Server Error"
            });
    }
});

// Update isPinned 

app.put("/update-note-pinned/:noteId", authenticateToken, async (req, res) => {
    const noteId = req.params.noteId;
    const { isPinned } = req.body;
    const { user } = req.user;

    try {
        const note = await Note.findOne({ _id : noteId, userId : user._id });

        if (!note) {
            return res
                .status(404)
                .json({
                    error : true,
                    message : "Note not found"
                });
        }

        console.log(note.isPinned);
        
        note.isPinned = isPinned;

        await note.save();
        console.log('isPinned Updated:', note.isPinned);

        return res.json({
            error : false,
            note,
            message : "isPinned updated successfully"
        });

    } catch (error) {
        return res
            .status(500)
            .json({
                error : true,
                message : "Internal Server Error"
            });
    }
});

// Search Notes

app.get("/search-notes/", authenticateToken, async (req, res) => {
    
    const { user } = req.user;
    const { query } = req.query;

    if (!query) {
        return res
        .status(400)
        .json({ 
            error : true,
            message : "Search query is required" 
        });
    }
 
    try {
        const matchingNotes = await Note.find({
           userId : user._id,
           $or : [
                { title : { $regex : new RegExp( query, "i" ) } },
                { content : { $regex : new RegExp( query, "i" ) } },
           ], 
        });

        return res.json({
            error : false,
            notes : matchingNotes,
            message : "Notes matching the search query retrieved successfully"
        });

    } catch (error) {
        return res
            .status(500)
            .json({
                error : true,
                message : "Internal Server Error"
            });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}.`);
});

export default app;
