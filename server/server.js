const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

mongoose.connect('mongodb://0.0.0.0:27017/feedback-db');

const feedbackSchema = new mongoose.Schema({
    comment: String,
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
});

const Feedback = mongoose.model('Feedback', feedbackSchema);
app.use(cors());
app.use(express.json());

const updateCount = async () => {
    try {
        const count = await Feedback.countDocuments();
        return count;
    } catch (error) {
        console.error(error);
        throw error;
    }
};

app.get('/api/feedback', async (req, res) => {
    try {
        const feedbacks = await Feedback.find();
        res.json(feedbacks);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post('/api/feedback', async (req, res) => {
    try {
        const { comment } = req.body;
        const newFeedback = new Feedback({
            comment,
        });

        const savedFeedback = await newFeedback.save();
        const count = await updateCount();
        io.emit('newFeedback', savedFeedback);

      
        io.emit('countUpdate', count);
        
        res.json(savedFeedback);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/feedback/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const feedback = await Feedback.findById(id);
        if (!feedback) {
            return res.status(404).json({ error: 'Feedback not found' });
        }
        await feedback.deleteOne(); 
        const count = await updateCount();
        io.emit('feedbackDeleted', { id: feedback._id });

       
        io.emit('countUpdate', count);

        res.json({ message: 'Feedback deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});



app.put('/api/feedback/:id/like', async (req, res) => {
    try {
        const { id } = req.params;

        const feedback = await Feedback.findById(id);
        if (!feedback) {
            return res.status(404).json({ error: 'Feedback not found' });
        }

        feedback.likes += 1;
        const updatedFeedback = await feedback.save();
        io.emit('updateFeedback', updatedFeedback);
        res.json(updatedFeedback);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/feedback/:id/dislike', async (req, res) => {
    try {
        const { id } = req.params;

        const feedback = await Feedback.findById(id);
        if (!feedback) {
            return res.status(404).json({ error: 'Feedback not found' });
        }

        feedback.dislikes += 1;
        const updatedFeedback = await feedback.save();
        io.emit('updateFeedback', updatedFeedback);
        res.json(updatedFeedback);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
io.on('connection', (socket) => {
    console.log('A user connected');
    socket.on('getCount', async () => {
        try {
            const count = await updateCount();
            io.emit('countUpdate', count);
        } catch (error) {
            console.error('Error updating count:', error);
        }
    });
    socket.on('disconnect', () => {
        console.log('A user disconnected');
        // Additional cleanup logic if needed
    });
});



const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    try {
        const count = await updateCount();
        io.emit('countUpdate', count);
    } catch (error) {
        console.error('Error emitting count on server start:', error);
    }
});

