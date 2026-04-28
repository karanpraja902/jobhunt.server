# JobHunt Server

## Overview
JobHunt Server is the backend service for the JobHunt platform, providing a robust API for managing users, job postings, and applications. Built with Node.js and Express, it uses MongoDB for data storage and integrates various middleware for secure authentication and file handling.

## Key Features
- **RESTful API**: Built with Express.js for scalable routing and controller logic.
- **Database Management**: Uses Mongoose for MongoDB object modeling and data validation.
- **Secure Authentication**: Implements JWT (JSON Web Tokens) with cookie parsing and password hashing via `bcryptjs`.
- **File Uploads**: Handles multi-part form data using Multer, with images and files managed through Cloudinary and DataURI.
- **Caching**: Utilizes `node-cache` for optimized data retrieval and performance.
- **Security & Config**: Employs `cors` for cross-origin requests and `dotenv` for environment variable management.

## Tech Stack
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) & [Mongoose](https://mongoosejs.com/)
- **Authentication**: JWT & `bcryptjs`
- **File Storage**: [Cloudinary](https://cloudinary.com/)
- **Other Utilities**: Multer, DataURI, Node Cache

## Project Structure
- `index.js`: The main entry point of the server.
- `controllers/`: Functions that handle incoming HTTP requests and format responses.
- `models/`: Mongoose schemas and models representing the database structure.
- `routes/`: Express router definitions that map URLs to controllers.
- `middlewares/`: Custom middleware functions for tasks like authentication and error handling.
- `utils/`: Helper functions and shared utilities.

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB (local instance or MongoDB Atlas)
- Cloudinary Account (for media uploads)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd jobhunt.server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root directory (refer to `.env.example` if available) and add the necessary configuration:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   CLOUDINARY_CLOUD_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   The server will start (typically on `http://localhost:5000`) and automatically restart on file changes using `nodemon`.

## Available Scripts
- `npm run dev`: Starts the server in development mode using `nodemon`.
