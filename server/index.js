import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 3000;

// Middleware to parse incoming JSON payloads
app.use(express.json());

// Set up file paths for local "database"
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'db.json');

// POST: Save document state
app.post('/api/save', (req, res) => {
    try {
        const state = req.body;
        fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2));
        res.status(200).json({ message: 'State saved successfully' });
    } catch (error) {
        console.error('Save error:', error);
        res.status(500).json({ error: 'Failed to save state' });
    }
});

// GET: Load document state
app.get('/api/load', (req, res) => {
    try {
        if (!fs.existsSync(DB_FILE)) {
            return res.status(200).json(null); // Return null if no save exists yet
        }
        const data = fs.readFileSync(DB_FILE, 'utf-8');
        res.status(200).json(JSON.parse(data));
    } catch (error) {
        console.error('Load error:', error);
        res.status(500).json({ error: 'Failed to load state' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});