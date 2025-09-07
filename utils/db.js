import mongoose from "mongoose";

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined in environment variables');
        }

        // Set mongoose options for better stability
        const options = {
            serverSelectionTimeoutMS: 10000, // Timeout after 10s instead of 30s
            socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
        };

        console.log('Attempting to connect to MongoDB...');
        console.log('MongoDB URI format check:', process.env.MONGO_URI.substring(0, 20) + '...');
        
        await mongoose.connect(process.env.MONGO_URI, options);
        
        console.log('✅ MongoDB connected successfully');
        console.log('Database Name:', mongoose.connection.name);
        console.log('Host:', mongoose.connection.host);
        
        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected successfully');
        });

        return mongoose.connection;
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        console.error('Full error:', error);
        
        // Exit process with failure
        process.exit(1);
    }
}

export default connectDB;
