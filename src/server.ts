import 'dotenv/config';
import http from 'node:http';

import express from 'express';


async function startServer() {

    const app = express();
    const server = http.createServer(app);

    const PORT = process.env.PORT || 3000;

    app.get('/health', (req, res) => {
        res.status(200).json({ status: 'ok' });
    });

    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}


startServer().catch((err) => {
    console.error('Error starting server:', err);
    process.exit(1);
});