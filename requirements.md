# Orbit - Requirements Specification

## 1. Project Overview

### 1.1 Project Name
**Orbit** - Autonomous Learning Engine

### 1.2 Problem Statement
The modern education and hiring landscape suffers from two critical problems:

1. **Credential Fraud**: Certificates, bootcamp diplomas, and online course completions can be easily faked or purchased. Employers cannot trust paper credentials.

2. **Passive Learning**: Users watch tutorial videos, copy-paste code from ChatGPT, and claim they "learned" a skill without genuine understanding. This creates a workforce that cannot apply knowledge under pressure.

Orbit solves both problems by implementing a strict AI interrogation system that verifies genuine understanding through:
- Plagiarism detection (comparing user summaries against video transcripts)
- Hyper-specific follow-up questions based on the user's own words
- 60-second countdown timers to prevent ChatGPT cheating
- Public Skill Passports that prove verified learning

### 1.3 Target Audience

**Primary Users**:
- Self-learners seeking verifiable proof of skill acquisition
- Job seekers who need credible credentials beyond traditional certificates
- Students preparing for technical interviews
- Career switchers building portfolios in new domains

**Secondary Users**:
- Employers and recruiters verifying candidate skills
- Educational institutions seeking anti-cheating mechanisms
- Bootcamps and online course providers wanting to add verification layers

### 1.4 Project Scope
Orbit is a web-based platform that generates personalized learning roadmaps for any topic, curates YouTube educational content, verifies user understanding through AI interrogation, and issues tamper-proof Skill Passports hosted on AWS S3.

## 2. Core Features

### 2.1 Curriculum Generation
- **Goal Input**: Users enter any learning goal (e.g., "Learn AWS Serverless", "Master React Hooks", "Understand Quantum Computing")
- **AI Roadmap**: Groq API (Meta Llama 3.1) generates a structured JSON roadmap with daily learning steps
- **Video Curation**: YouTube Data API v3 automatically fetches the top educational video for each step
- **Structured Learning Path**: Each day is locked until the previous day is completed and verified

### 2.2 Learning Phase
- **Interactive Roadmap**: React frontend displays the full learning path with visual lock indicators
- **Embedded Videos**: Users watch curated YouTube videos directly in the platform
- **Summary Submission**: After watching, users write a summary of what they learned in their own words
- **Progress Tracking**: MongoDB stores completion status for each day/task

### 2.3 Plagiarism Filter (Scikit-Learn)
- **Transcript Extraction**: System fetches YouTube video transcripts via API
- **TF-IDF Vectorization**: FastAPI microservice converts both the transcript and user summary into TF-IDF vectors
- **Cosine Similarity**: Calculates similarity score between user summary and video transcript
- **Rejection Threshold**: If similarity > 90%, the submission is rejected as copy-pasted
- **Feedback**: User receives clear message explaining why their submission was rejected

### 2.4 AI Viva (Interrogation)
- **Context-Aware Questions**: Groq API generates follow-up questions based specifically on the user's summary (not generic questions)
- **Variable-Based Interrogation**: Questions reference specific concepts, examples, or terminology the user mentioned
- **Adaptive Difficulty**: Questions are tailored to the complexity of the user's explanation
- **Single Question Per Task**: One focused question to verify understanding

### 2.5 60-Second Defense
- **Countdown Timer**: Strict 60-second timer displayed prominently on screen
- **No Pausing**: Timer cannot be paused or reset once started
- **Text Input Only**: User must type their defense answer before time expires
- **Anti-Cheating**: Short time window prevents users from consulting ChatGPT or external resources
- **Submission Lock**: After 60 seconds, the input field is disabled and answer is auto-submitted

### 2.6 Verification & Progression
- **AI Grading**: Groq API evaluates the defense answer for logical coherence and accuracy
- **Pass/Fail Verdict**: Clear verdict with reasoning provided to the user
- **Task Unlocking**: Upon passing, the next day/task is unlocked in MongoDB
- **Retry Mechanism**: If failed, user can rewatch the video and resubmit a new summary
- **Attempt Tracking**: System logs all attempts for transparency

### 2.7 Skill Passport Generation
- **Completion Trigger**: When all tasks in a course are completed, passport generation begins
- **Verified Log**: Passport includes all user summaries, AI questions, and defense answers
- **Metadata**: User name, course title, completion date, verification ID
- **AWS S3 Upload**: Static HTML file uploaded to public S3 bucket
- **Public URL**: User receives a shareable CloudFront/S3 URL
- **Tamper-Proof**: S3 versioning ensures the passport cannot be modified after creation

### 2.8 User Dashboard
- **Active Courses**: Display all in-progress learning paths
- **Completion Stats**: Show percentage complete, days finished, days remaining
- **Passport Gallery**: List all earned Skill Passports with shareable links
- **Performance Metrics**: Track pass/fail rates, average defense time, retry counts

## 3. Technical Requirements

### 3.1 Frontend (React.js + Tailwind CSS)
- Responsive design for desktop, tablet, and mobile
- Real-time countdown timer component
- YouTube video embedding (iframe or React Player)
- Form validation for summary and defense inputs
- Loading states for all async operations
- Error handling with user-friendly messages
- Hosted on Vercel with automatic deployments

### 3.2 Core Backend (Node.js + Express + MongoDB)
- RESTful API architecture
- JWT-based authentication
- MongoDB Atlas for data persistence
- Integration with Groq API for LLM inference
- Integration with YouTube Data API v3
- Integration with FastAPI microservice
- AWS SDK for S3 uploads
- Error logging and monitoring
- Hosted on Render with auto-scaling

### 3.3 AI Microservice (Python + FastAPI + Scikit-Learn)
- FastAPI for high-performance async endpoints
- Scikit-Learn for TF-IDF vectorization and cosine similarity
- YouTube transcript extraction (youtube-transcript-api)
- Groq API integration for question generation and grading
- JSON request/response format
- CORS configuration for Node.js backend
- Hosted on Render as separate service

### 3.4 External APIs
- **Groq API**: Meta Llama 3.1 for ultra-fast LLM inference
- **YouTube Data API v3**: Video search and metadata retrieval
- **YouTube Transcript API**: Extract video captions/transcripts

### 3.5 Cloud Storage
- **Amazon S3**: Public bucket for Skill Passport hosting
- **CloudFront (Optional)**: CDN for global passport access
- **S3 Versioning**: Tamper-proof storage

## 4. Environment Variables & API Keys

### 4.1 Core Backend (Node.js)
```
# Server Configuration
PORT=5000
NODE_ENV=production

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/orbit

# Authentication
JWT_SECRET=<random-256-bit-secret>
JWT_EXPIRY=24h

# External APIs
GROQ_API_KEY=<groq-api-key>
YOUTUBE_API_KEY=<youtube-data-api-v3-key>

# AWS S3
AWS_ACCESS_KEY_ID=<aws-access-key>
AWS_SECRET_ACCESS_KEY=<aws-secret-key>
AWS_REGION=us-east-1
S3_BUCKET_NAME=orbit-skill-passports

# Microservice
FASTAPI_URL=https://orbit-ai-service.onrender.com

# Frontend
FRONTEND_URL=https://orbit-learn.vercel.app
```

### 4.2 AI Microservice (Python FastAPI)
```
# Server Configuration
PORT=8000
ENVIRONMENT=production

# External APIs
GROQ_API_KEY=<groq-api-key>

# CORS
ALLOWED_ORIGINS=https://orbit-api.onrender.com,http://localhost:5000
```

### 4.3 Frontend (React.js)
```
# API Endpoints
VITE_API_URL=https://orbit-api.onrender.com
VITE_FASTAPI_URL=https://orbit-ai-service.onrender.com
```

## 5. API Key Setup Instructions

### 5.1 Groq API
1. Visit https://console.groq.com
2. Sign up for a free account
3. Navigate to API Keys section
4. Generate new API key
5. Copy key to both Node.js and FastAPI `.env` files

### 5.2 YouTube Data API v3
1. Visit https://console.cloud.google.com
2. Create new project or select existing
3. Enable "YouTube Data API v3"
4. Navigate to Credentials → Create Credentials → API Key
5. Restrict key to YouTube Data API v3 only
6. Copy key to Node.js `.env` file

### 5.3 AWS S3
1. Visit https://console.aws.amazon.com/iam
2. Create new IAM user with programmatic access
3. Attach policy: `AmazonS3FullAccess` (or custom policy with PutObject, GetObject)
4. Save Access Key ID and Secret Access Key
5. Create S3 bucket: `orbit-skill-passports`
6. Set bucket policy to allow public read access
7. Copy credentials to Node.js `.env` file

### 5.4 MongoDB Atlas
1. Visit https://www.mongodb.com/cloud/atlas
2. Create free M0 cluster
3. Create database user with read/write permissions
4. Whitelist IP addresses (0.0.0.0/0 for development)
5. Get connection string from "Connect" → "Connect your application"
6. Replace `<username>` and `<password>` in connection string
7. Copy to Node.js `.env` file

## 6. Non-Functional Requirements

### 6.1 Performance
- Groq API responses within 3 seconds (ultra-fast inference)
- YouTube video search within 2 seconds
- Plagiarism check within 5 seconds
- Page load time under 2 seconds
- 60-second timer must be accurate to ±100ms

### 6.2 Scalability
- Support 1,000+ concurrent users
- Handle 10,000+ courses in MongoDB
- Process 100+ plagiarism checks per minute

### 6.3 Security
- HTTPS encryption for all data transmission
- JWT tokens with secure signing
- API keys stored in environment variables (never in code)
- Input sanitization to prevent injection attacks
- Rate limiting on API endpoints

### 6.4 Reliability
- 99% uptime for core services
- Automatic retry for failed API calls (3 attempts with exponential backoff)
- Graceful error handling with user feedback
- Data backup for MongoDB (Atlas automatic backups)

### 6.5 Usability
- Intuitive UI with clear instructions
- Visual feedback for all user actions
- Accessible design (WCAG 2.1 guidelines)
- Mobile-responsive layout

## 7. Success Metrics

### 7.1 User Engagement
- Average course completion rate > 60%
- Average time spent per task > 15 minutes
- Retry rate < 30% (indicates appropriate difficulty)

### 7.2 Verification Quality
- Plagiarism detection accuracy > 95%
- AI question relevance score > 4/5 (user feedback)
- Defense pass rate between 70-80% (not too easy, not too hard)

### 7.3 Platform Growth
- 1,000+ registered users in first 3 months
- 100+ Skill Passports issued
- 50+ unique course topics generated

## 8. Future Enhancements (Out of Scope for Hackathon)

- Multi-language support (Hindi, Spanish, etc.)
- Voice-based defense answers (speech-to-text)
- Peer review system for community validation
- Blockchain-based passport verification
- Integration with LinkedIn for credential sharing
- Mobile native apps (React Native)
- Gamification (badges, leaderboards, streaks)
- Team learning mode (collaborative courses)
- Employer dashboard for candidate verification
- Custom course creation by educators
