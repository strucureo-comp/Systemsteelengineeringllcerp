import type { Db, Collection } from 'mongodb';

interface BasicUserDoc {
    _id: string;
    email?: string;
    full_name?: string;
    role?: string;
    password?: string;
}

export function getCollections(db: Db): {
    users: Collection<BasicUserDoc>;
} {
    return {
        users: db.collection<BasicUserDoc>('users'),
    };
}
