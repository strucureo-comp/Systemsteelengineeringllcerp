import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'bridgebreak';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getMongoDb(): Promise<Db> {
    if (cachedDb) return cachedDb;

    const client = new MongoClient(MONGODB_URI);
    await client.connect();

    cachedClient = client;
    cachedDb = client.db(MONGODB_DB);

    return cachedDb;
}

export function getMongoClient(): MongoClient | null {
    return cachedClient;
}
