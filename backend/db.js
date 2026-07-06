const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        
        // Rebuild/sync indexes to apply the sparse unique index configuration cleanly
        setTimeout(async () => {
            try {
                const Faculty = mongoose.model('Faculty');
                if (Faculty) {
                    await Faculty.syncIndexes();
                    console.log('Faculty database indexes synchronized.');

                    // Data migration: Set default values for status, availability, experience, department on legacy users
                    const migrateRes = await Faculty.updateMany(
                        { status: { $exists: false } },
                        { $set: { status: 'Active', availability: 'Available', experience: 0, department: 'AI & DS' } }
                    );
                    if (migrateRes.modifiedCount > 0) {
                        console.log(`Successfully migrated ${migrateRes.modifiedCount} legacy faculty profiles to Active.`);
                    }
                }
            } catch (err) {
                console.log('Database index/migration warning (non-fatal):', err.message);
            }
        }, 1000);
    } catch (error) {
        console.error(`Database Connection Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;