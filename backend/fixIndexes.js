/**
 * One-time migration script to fix stale MongoDB indexes
 * from the old Faculty schema.
 * 
 * Old schema had:
 *   - panNumber: unique (conflicts with multiple null values)
 *   - shift: required (field no longer exists)
 *   - roles: required (field no longer exists)
 * 
 * Run this ONCE with: node fixIndexes.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function fixIndexes() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected:', mongoose.connection.host);

        const collection = mongoose.connection.collection('faculties');

        // List existing indexes
        const indexes = await collection.indexes();
        console.log('\nExisting indexes:');
        indexes.forEach(idx => console.log(' -', JSON.stringify(idx.key), idx.unique ? '(unique)' : '', idx.sparse ? '(sparse)' : ''));

        // Drop the old panNumber unique index if it exists (non-sparse)
        const panIndex = indexes.find(idx => idx.key && idx.key.panNumber !== undefined && !idx.sparse);
        if (panIndex) {
            console.log('\nDropping old panNumber unique index:', panIndex.name);
            await collection.dropIndex(panIndex.name);
            console.log('Done.');
        } else {
            console.log('\nNo conflicting panNumber index found (already OK or not present).');
        }

        // Re-create panNumber index as sparse + unique (allows multiple nulls)
        console.log('\nEnsuring sparse unique index on panNumber...');
        await collection.createIndex({ panNumber: 1 }, { unique: true, sparse: true, name: 'panNumber_sparse_unique' });
        console.log('panNumber sparse unique index created.');

        // Verify final indexes
        const finalIndexes = await collection.indexes();
        console.log('\nFinal indexes:');
        finalIndexes.forEach(idx => console.log(' -', JSON.stringify(idx.key), idx.unique ? '(unique)' : '', idx.sparse ? '(sparse)' : ''));

        console.log('\n✅ Migration complete. You can now restart the server.\n');
    } catch (err) {
        console.error('Migration error:', err.message);
    } finally {
        await mongoose.disconnect();
    }
}

fixIndexes();
