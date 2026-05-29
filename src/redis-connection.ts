import { Redis } from "ioredis";

function createRedisConnection(host = "localhost", port = 6379) {
    return new Redis({
        host,
        port,
    });
}

export const redis = createRedisConnection();

export const publisher = createRedisConnection();
export const subscriber = createRedisConnection();