# Nexbaron API

Backend API for Nexbaron Services Private Limited built with Express.js, TypeScript, and Mongoose.

## Features

- ✅ Express.js + TypeScript
- ✅ Mongoose + MongoDB
- ✅ Multer file upload
- ✅ Helmet security
- ✅ CORS configuration
- ✅ Compression
- ✅ Winston logging
- ✅ Zod validation

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your MongoDB connection:
```
DATABASE_URL="mongodb://localhost:27017/nexbaron"
```
Or use MongoDB Atlas connection string:
```
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/nexbaron"
```

4. Make sure MongoDB is running locally or use MongoDB Atlas.

5. Run the development server:
```bash
npm run dev
```

The API will be available at [http://localhost:3001](http://localhost:3001).

## API Routes

- `POST /api/contact` - Submit contact inquiry
- `POST /api/tenders/upload` - Upload tender documents
- `GET /health` - Health check endpoint

## Project Structure

```
nexbaron-api/
├── src/
│   ├── features/          # Feature-based modules
│   ├── models/            # Mongoose models
│   ├── middleware/        # Express middleware
│   └── utils/            # Utilities
└── uploads/              # Uploaded files
```

## Database

The application uses MongoDB with Mongoose ODM. The database connection is automatically established when the server starts. Models are defined in `src/models/`.

## Build

```bash
npm run build
npm start
```

## Deployment

The application is optimized for deployment on Railway, Render, or DigitalOcean.

