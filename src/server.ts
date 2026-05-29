import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';

import express from 'express';
import { Server } from 'socket.io';

import { publisher, subscriber, redis } from './redis-connection.js';

const CHECKBOXES_SIZE = Number(process.env.CHECKBOXES_SIZE) || 108;
const CHECKBOXE_STATE_KEY = 'checkboxes-state';

// const state = {
//     checkboxes: Array(CHECKBOXES_SIZE).fill(false),
// };

async function startServer() {
    const PORT = process.env.PORT || 3000;

    const app = express();
    const server = http.createServer(app);


    const io = new Server();
    io.attach(server);

    // Subscribe to Redis channel for checkbox changes
    // await subscriber.subscribe(
    //     'internal-server:checkbox:changes',
    //     (message) => {
    //         const { index, isChecked } = JSON.parse(message);
    //         state.checkboxes[index] = isChecked;
    //         // Broadcast the change to all connected clients
    //         io.emit('server:checkbox:update', { index, isChecked });
    //     }
    // )

    await subscriber.subscribe('internal-server:checkbox:changes');
    subscriber.on('message', (channel, message) => {
        if (channel === 'internal-server:checkbox:changes') {
            const { index, isChecked } = JSON.parse(message);
            // Update the server state
            // state.checkboxes[index] = isChecked;
            // Broadcast the change to all connected clients
            io.emit('server:checkbox:update', { index, isChecked });
        }
    });

    // Socket.IO Handlers
    io.on('connection', (socket) => {
        console.log('A user connected:', { id: socket.id });

        socket.on('client:checkbox:change', async (data) => {
            console.log('Received checkbox change:', data);

            // io.emit('server:checkbox:update', data); // Broadcast to all clients
            // Update the server state
            // state.checkboxes[data.index] = data.isChecked;
            const existingState = await redis.get(CHECKBOXE_STATE_KEY);
            if (existingState) {
                const remoteData = JSON.parse(existingState);
                remoteData[data.index] = data.isChecked;

                redis.set(
                    CHECKBOXE_STATE_KEY, 
                    JSON.stringify(remoteData)
                );
            } else {
                redis.set(
                    CHECKBOXE_STATE_KEY, 
                    JSON.stringify(new Array(CHECKBOXES_SIZE).fill(false))
                );
            }
            // Publish the change to Redis
            publisher.publish(
                'internal-server:checkbox:changes', 
                JSON.stringify(data)
            );
        });
    });

    // Express Handlers
    app.use(express.static(path.join(process.cwd(), 'public')));

    app.get('/checkboxes', async (_, res) => {
        const existingState = await redis.get(CHECKBOXE_STATE_KEY);
        if (existingState) {
            const remoteData = JSON.parse(existingState);
            res.json({ checkboxes: remoteData });
        } else {
            res.json({ 
                checkboxes: new Array(CHECKBOXES_SIZE).fill(false) 
            });
        }
    });
    
    app.get('/health', (_, res) => {
        res.status(200).json({ status: 'ok' });
    });

    server.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}


startServer().catch((err) => {
    console.error('Error starting server:', err);
    process.exit(1);
});