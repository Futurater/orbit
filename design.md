# Orbit - Technical Design Document

## 1. System Architecture Overview

### 1.1 Microservice Architecture

Orbit follows a microservice architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                  Frontend (React + Tailwind)                 │
│                    Hosted on Vercel                          │
│  - Roadmap UI  - Video Player  - Summary Input              │
│  - 60s Timer   - Defense Input  - Passport Gallery          │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS REST API
                       │
┌──────────────────────▼──────────────────────────────────────┐
│           Core Backend (Node.js + Express)                   │
│                 Hosted on Render                             │
│  - API Gateway & Orchestration Layer                         │
│  - Authentication (JWT)                                      │
│  - MongoDB Operations (User, Course, Task)                   │
│  - Groq API Integration (Curriculum Generation)              │
│  - YouTube Data API v3 (Video Search)                        │
│  - AWS S3 Integration (Passport Upload)                      │
└──────┬────────────────────────────────┬──────────────────────┘
       │                                │
       │ HTTP POST                      │ AWS SDK
       │ (Plagiarism Check)             │
       │                                │
┌──────▼────────────────────┐    ┌──────▼──────────────────────┐
│  AI Microservice          │    │  Amazon S3                   │
│  (Python + FastAPI)       │    │  - Skill Passports (HTML)    │
│  Hosted on Render         │    │  - Public Read Access        │
│                           │    │  - Versioning Enabled        │
│  - Scikit-Learn           │    └──────────────────────────────┘
│    (TF-IDF + Cosine)      │
│  - YouTube Transcript API │    ┌──────────────────────────────┐
│  - Groq API Integration   │    │  MongoDB Atlas               │
│    (Question + Grading)   │    │  - users collection          │
└───────────────────────────┘    │  - courses collection        │
                                 │  - tasks collection          │
                                 └──────────────────────────────┘
```

### 1.2 Separation of Concerns

**Frontend (React)**:
- User interface and experience
- State management (user auth, course progress)
- API calls to Node.js backend
- No direct access to AI microservice or external APIs

**Core Backend (Node.js)**:
- API Gateway: Single entry point for frontend
- Orchestration: Coordinates between MongoDB, FastAPI, Groq, YouTube, S3
- Business Logic: User authentication, course creation, task unlocking
- Data Persistence: MongoDB CRUD operations
- Does NOT handle: ML/AI computations (delegated to FastAPI)

**AI Microservice (FastAPI)**:
- Specialized AI/ML operations only
- Plagiarism detection (Scikit-Learn)
- AI question generation (Groq API)
- AI answer grading (Groq API)
- Stateless: No database access, pure computation
- Receives data from Node.js, returns results

**Why This Architecture?**:
- **Scalability**: AI microservice can scale independently
- **Performance**: Python/FastAPI optimized for ML workloads
- **Maintainability**: Clear boundaries between services
- **Cost**: Can deploy AI service on cheaper instances (CPU-only)
- **Flexibility**: Easy to swap ML models or add new AI features

## 2. MongoDB Schema Design

### 2.1 Users Collection

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  email: "user@example.com",
  passwordHash: "$2b$10$...",  // bcrypt hash
  username: "johndoe",
  createdAt: ISODate("2026-02-15T10:30:00Z"),
  lastLogin: ISODate("2026-02-15T14:20:00Z"),
  totalCourses: 3,
  completedCourses: 1,
  passports: [
    {
      passportId: ObjectId("507f1f77bcf86cd799439012"),
      courseId: ObjectId("507f1f77bcf86cd799439013"),
      s3Url: "https://orbit-skill-passports.s3.amazonaws.com/passport_abc123.html",
      issuedAt: ISODate("2026-02-20T18:00:00Z")
    }
  ]
}
```

**Indexes**:
- `email`: Unique index for login lookups
- `_id`: Default primary key

### 2.2 Courses Collection

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439013"),
  userId: ObjectId("507f1f77bcf86cd799439011"),  // Reference to users
  goalText: "Learn AWS Serverless",
  title: "AWS Serverless Mastery",
  description: "Complete roadmap for serverless architecture",
  status: "active",  // active | completed
  totalDays: 10,
  completedDays: 3,
  createdAt: ISODate("2026-02-15T10:35:00Z"),
  updatedAt: ISODate("2026-02-18T09:20:00Z"),
  passportGenerated: false
}
```

**Indexes**:
- `userId`: Index for user's course queries
- `_id`: Default primary key

### 2.3 Tasks Collection (Daily Learning Nodes)

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439014"),
  courseId: ObjectId("507f1f77bcf86cd799439013"),  // Reference to courses
  userId: ObjectId("507f1f77bcf86cd799439011"),    // Reference to users
  dayNumber: 1,
  title: "Introduction to AWS Lambda",
  description: "Learn the basics of serverless functions",
  youtubeVideo: {
    videoId: "eOBq__h4OJ4",
    title: "AWS Lambda Tutorial for Beginners",
    channelName: "freeCodeCamp",
    thumbnailUrl: "https://i.ytimg.com/vi/eOBq__h4OJ4/maxresdefault.jpg",
    duration: "PT45M30S",  // ISO 8601 duration
    transcript: "Welcome to AWS Lambda tutorial..."  // Full transcript
  },
  status: "unlocked",  // locked | unlocked | in_progress | completed
  userSummary: null,  // User's written summary (after watching video)
  plagiarismScore: null,  // Cosine similarity score (0-1)
  aiQuestion: null,  // Generated follow-up question
  userDefense: null,  // User's answer to AI question
  defenseTime: null,  // Time taken to answer (in seconds)
  aiVerdict: null,  // passed | failed
  aiReasoning: null,  // Explanation from Groq
  attempts: 0,  // Number of retry attempts
  unlockedAt: ISODate("2026-02-15T10:35:00Z"),
  completedAt: null,
  createdAt: ISODate("2026-02-15T10:35:00Z"),
  updatedAt: ISODate("2026-02-15T10:35:00Z")
}
```

**Indexes**:
- `courseId`: Index for course's task queries
- `userId`: Index for user's task queries
- Compound index: `{ courseId: 1, dayNumber: 1 }` for ordered task retrieval

### 2.4 Schema Relationships

```
users (1) ──────< (many) courses
courses (1) ─────< (many) tasks
users (1) ───────< (many) tasks (denormalized for quick access)
```

**Why Denormalize userId in Tasks?**:
- Faster queries: Get all user tasks without joining courses
- Simpler aggregation: Calculate user stats directly from tasks
- Trade-off: Slight data redundancy for better read performance

## 3. API Endpoint Specification

### 3.1 Core Backend (Node.js) Endpoints

#### Authentication
```
POST /api/auth/register
Body: { email, password, username }
Response: { token, user: { id, email, username } }

POST /api/auth/login
Body: { email, password }
Response: { token, user: { id, email, username } }

GET /api/auth/me
Headers: { Authorization: "Bearer <token>" }
Response: { user: { id, email, username, totalCourses, completedCourses } }
```

#### Courses
```
POST /api/courses
Headers: { Authorization: "Bearer <token>" }
Body: { goalText: "Learn AWS Serverless" }
Response: { course: { id, title, totalDays, tasks: [...] } }
Flow: Node.js → Groq API → YouTube API → MongoDB

GET /api/courses
Headers: { Authorization: "Bearer <token>" }
Response: { courses: [{ id, title, status, completedDays, totalDays }] }

GET /api/courses/:courseId
Headers: { Authorization: "Bearer <token>" }
Response: { course: { id, title, tasks: [...] } }
```

#### Tasks
```
GET /api/tasks/:taskId
Headers: { Authorization: "Bearer <token>" }
Response: { task: { id, title, youtubeVideo, status, ... } }

POST /api/tasks/:taskId/submit-summary
Headers: { Authorization: "Bearer <token>" }
Body: { summary: "I learned that AWS Lambda..." }
Response: { plagiarismPassed: true, question: "Why did you choose..." }
Flow: Node.js → FastAPI (plagiarism) → Groq (question) → MongoDB

POST /api/tasks/:taskId/submit-defense
Headers: { Authorization: "Bearer <token>" }
Body: { defense: "I chose Lambda because...", timeTaken: 45 }
Response: { verdict: "passed", reasoning: "User demonstrated...", nextTaskUnlocked: true }
Flow: Node.js → FastAPI (grading) → MongoDB (unlock next task)
```

#### Passports
```
GET /api/passports
Headers: { Authorization: "Bearer <token>" }
Response: { passports: [{ id, courseTitle, s3Url, issuedAt }] }

GET /api/passports/:passportId
Response: { passport: { courseTitle, completionDate, tasks: [...], s3Url } }
(Public endpoint for verification)
```

### 3.2 AI Microservice (FastAPI) Endpoints

```
POST /plagiarism-check
Body: {
  userSummary: "I learned that AWS Lambda is a serverless compute service...",
  videoTranscript: "AWS Lambda is a compute service that lets you run code..."
}
Response: {
  isPlagiarized: false,
  similarityScore: 0.42,
  threshold: 0.90
}

POST /generate-question
Body: {
  taskTitle: "Introduction to AWS Lambda",
  userSummary: "I learned that AWS Lambda is a serverless compute service..."
}
Response: {
  question: "You mentioned Lambda is serverless. Can you explain what happens to your code when no requests are coming in?"
}

POST /grade-defense
Body: {
  question: "Can you explain what happens to your code when no requests are coming in?",
  userDefense: "When there are no requests, Lambda scales down to zero instances...",
  taskContext: "Introduction to AWS Lambda"
}
Response: {
  verdict: "passed",
  reasoning: "User correctly explained Lambda's auto-scaling behavior and cost implications.",
  confidence: 0.87
}
```

## 4. Detailed Data Flow: The "Orbit Loop"

### 4.1 Curriculum Generation Flow

```
1. User enters goal in React form
   Input: "Learn AWS Serverless"

2. React → POST /api/courses
   Headers: { Authorization: "Bearer <jwt>" }
   Body: { goalText: "Learn AWS Serverless" }

3. Node.js verifies JWT, extracts userId

4. Node.js → Groq API (Curriculum Generation)
   POST https://api.groq.com/openai/v1/chat/completions
   Body: {
     model: "llama-3.1-70b-versatile",
     messages: [
       {
         role: "system",
         content: "You are a curriculum designer. Generate a 10-day learning roadmap in JSON format."
       },
       {
         role: "user",
         content: "Create a roadmap for: Learn AWS Serverless"
       }
     ],
     response_format: { type: "json_object" },
     temperature: 0.7
   }

5. Groq returns JSON roadmap:
   {
     title: "AWS Serverless Mastery",
     days: [
       { dayNumber: 1, title: "Introduction to AWS Lambda", description: "..." },
       { dayNumber: 2, title: "API Gateway Basics", description: "..." },
       ...
     ]
   }

6. For each day, Node.js → YouTube Data API v3
   GET https://www.googleapis.com/youtube/v3/search
   Params: {
     part: "snippet",
     q: "Introduction to AWS Lambda tutorial",
     type: "video",
     order: "relevance",
     maxResults: 1,
     key: <YOUTUBE_API_KEY>
   }

7. YouTube returns video metadata:
   {
     videoId: "eOBq__h4OJ4",
     title: "AWS Lambda Tutorial for Beginners",
     channelName: "freeCodeCamp",
     thumbnailUrl: "https://i.ytimg.com/vi/eOBq__h4OJ4/maxresdefault.jpg"
   }

8. Node.js creates Course document in MongoDB:
   {
     userId, goalText, title, status: "active", totalDays: 10
   }

9. Node.js creates Task documents (one per day):
   {
     courseId, userId, dayNumber, title, description,
     youtubeVideo: { videoId, title, ... },
     status: dayNumber === 1 ? "unlocked" : "locked"
   }

10. Node.js → React
    Response: { course: { id, title, totalDays, tasks: [...] } }

11. React displays roadmap with Day 1 unlocked
```

### 4.2 Learning Phase Flow

```
1. User clicks "Day 1" in React roadmap

2. React → GET /api/tasks/:taskId

3. Node.js fetches Task from MongoDB

4. Node.js → React
   Response: { task: { title, description, youtubeVideo, status } }

5. React displays:
   - YouTube video (embedded iframe)
   - Task description
   - "Submit Summary" button (disabled until video plays)

6. User watches video, types summary in textarea

7. User clicks "Submit Summary"

8. React → POST /api/tasks/:taskId/submit-summary
   Body: { summary: "I learned that AWS Lambda..." }
```

### 4.3 Plagiarism Filter Flow

```
9. Node.js receives summary

10. Node.js fetches video transcript:
    - Check if transcript exists in Task document
    - If not, fetch from YouTube Transcript API
    - Store in Task.youtubeVideo.transcript

11. Node.js → FastAPI (Plagiarism Check)
    POST http://orbit-ai-service.onrender.com/plagiarism-check
    Body: {
      userSummary: "I learned that AWS Lambda...",
      videoTranscript: "AWS Lambda is a compute service..."
    }

12. FastAPI processes:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform([userSummary, videoTranscript])
    similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
    
    isPlagiarized = similarity > 0.90

13. FastAPI → Node.js
    Response: { isPlagiarized: false, similarityScore: 0.42 }

14. IF isPlagiarized === true:
    Node.js → React
    Response: { error: "Your summary is too similar to the video transcript. Please write in your own words." }
    STOP HERE (user must resubmit)

15. IF isPlagiarized === false:
    Continue to AI Viva...
```

### 4.4 AI Viva (Interrogation) Flow

```
16. Node.js → FastAPI (Generate Question)
    POST http://orbit-ai-service.onrender.com/generate-question
    Body: {
      taskTitle: "Introduction to AWS Lambda",
      userSummary: "I learned that AWS Lambda..."
    }

17. FastAPI → Groq API
    POST https://api.groq.com/openai/v1/chat/completions
    Body: {
      model: "llama-3.1-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are an interviewer. Generate ONE specific follow-up question based on the user's summary. Reference their exact words."
        },
        {
          role: "user",
          content: "Task: Introduction to AWS Lambda\n\nUser's Summary: I learned that AWS Lambda...\n\nGenerate a question."
        }
      ],
      temperature: 0.6,
      max_tokens: 150
    }

18. Groq returns question:
    "You mentioned Lambda is serverless. Can you explain what happens to your code when no requests are coming in?"

19. FastAPI → Node.js
    Response: { question: "You mentioned Lambda is serverless..." }

20. Node.js updates Task in MongoDB:
    {
      userSummary: "I learned that AWS Lambda...",
      plagiarismScore: 0.42,
      aiQuestion: "You mentioned Lambda is serverless...",
      status: "in_progress"
    }

21. Node.js → React
    Response: { question: "You mentioned Lambda is serverless..." }

22. React displays modal:
    - Question text
    - 60-second countdown timer (starts immediately)
    - Textarea for defense answer
    - "Submit" button
```

### 4.5 60-Second Defense Flow

```
23. Timer starts: 60 seconds countdown

24. User types defense answer

25. EITHER:
    a) User clicks "Submit" before 60s
    b) Timer reaches 0, auto-submit

26. React → POST /api/tasks/:taskId/submit-defense
    Body: {
      defense: "When there are no requests, Lambda scales down...",
      timeTaken: 45  // seconds
    }

27. Node.js → FastAPI (Grade Defense)
    POST http://orbit-ai-service.onrender.com/grade-defense
    Body: {
      question: "You mentioned Lambda is serverless...",
      userDefense: "When there are no requests, Lambda scales down...",
      taskContext: "Introduction to AWS Lambda"
    }

28. FastAPI → Groq API
    POST https://api.groq.com/openai/v1/chat/completions
    Body: {
      model: "llama-3.1-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a grader. Evaluate if the user's answer demonstrates understanding. Return JSON: {verdict: 'passed'/'failed', reasoning: '...', confidence: 0.0-1.0}"
        },
        {
          role: "user",
          content: "Question: You mentioned Lambda is serverless...\n\nUser's Answer: When there are no requests, Lambda scales down...\n\nEvaluate."
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    }

29. Groq returns:
    {
      verdict: "passed",
      reasoning: "User correctly explained Lambda's auto-scaling behavior.",
      confidence: 0.87
    }

30. FastAPI → Node.js
    Response: { verdict: "passed", reasoning: "...", confidence: 0.87 }

31. Node.js updates Task in MongoDB:
    {
      userDefense: "When there are no requests...",
      defenseTime: 45,
      aiVerdict: "passed",
      aiReasoning: "User correctly explained...",
      status: "completed",
      completedAt: new Date()
    }

32. Node.js finds next task (dayNumber + 1)

33. Node.js updates next Task:
    {
      status: "unlocked",
      unlockedAt: new Date()
    }

34. Node.js updates Course:
    {
      completedDays: completedDays + 1
    }

35. Node.js → React
    Response: {
      verdict: "passed",
      reasoning: "User correctly explained...",
      nextTaskUnlocked: true,
      nextTaskId: "507f1f77bcf86cd799439015"
    }

36. React displays success message and unlocks Day 2
```

### 4.6 Skill Passport Generation Flow

```
37. When Course.completedDays === Course.totalDays:

38. Node.js generates HTML passport:
    - User name, email
    - Course title, completion date
    - Verification ID (UUID)
    - Table of all tasks with:
      * Day number, title
      * User summary (truncated)
      * AI question
      * User defense
      * Verdict
    - Orbit branding, timestamp

39. Node.js → AWS S3
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3();
    
    const params = {
      Bucket: 'orbit-skill-passports',
      Key: `passports/passport_${passportId}.html`,
      Body: htmlContent,
      ContentType: 'text/html',
      ACL: 'public-read'
    };
    
    await s3.putObject(params).promise();

40. S3 returns URL:
    https://orbit-skill-passports.s3.amazonaws.com/passports/passport_abc123.html

41. Node.js updates User document:
    {
      passports: [
        {
          passportId,
          courseId,
          s3Url: "https://orbit-skill-passports.s3...",
          issuedAt: new Date()
        }
      ]
    }

42. Node.js updates Course:
    {
      status: "completed",
      passportGenerated: true
    }

43. Node.js → React
    Response: {
      passportUrl: "https://orbit-skill-passports.s3...",
      message: "Congratulations! Your Skill Passport is ready."
    }

44. React displays:
    - Success animation
    - Shareable passport link
    - Social share buttons
```

## 5. Technology Stack Details

### 5.1 Frontend (React + Tailwind)

**Dependencies**:
```json
{
  "react": "^18.2.0",
  "react-router-dom": "^6.20.0",
  "axios": "^1.6.0",
  "react-player": "^2.13.0",
  "tailwindcss": "^3.3.0",
  "react-hot-toast": "^2.4.1"
}
```

**Key Components**:
- `CourseCreator.jsx`: Goal input form
- `Roadmap.jsx`: Display all tasks with lock states
- `TaskView.jsx`: Video player + summary input
- `DefenseModal.jsx`: 60-second timer + defense input
- `PassportGallery.jsx`: List of earned passports

**Deployment**: Vercel (automatic from GitHub)

### 5.2 Core Backend (Node.js + Express)

**Dependencies**:
```json
{
  "express": "^4.18.2",
  "mongoose": "^8.0.0",
  "jsonwebtoken": "^9.0.2",
  "bcrypt": "^5.1.1",
  "axios": "^1.6.0",
  "aws-sdk": "^2.1500.0",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1"
}
```

**Project Structure**:
```
backend/
├── controllers/
│   ├── authController.js
│   ├── courseController.js
│   ├── taskController.js
│   └── passportController.js
├── models/
│   ├── User.js
│   ├── Course.js
│   └── Task.js
├── routes/
│   ├── authRoutes.js
│   ├── courseRoutes.js
│   ├── taskRoutes.js
│   └── passportRoutes.js
├── services/
│   ├── groqService.js
│   ├── youtubeService.js
│   ├── fastApiService.js
│   └── s3Service.js
├── middleware/
│   ├── auth.js
│   └── errorHandler.js
├── utils/
│   └── logger.js
├── server.js
└── .env
```

**Deployment**: Render (Node.js service)

### 5.3 AI Microservice (Python + FastAPI)

**Dependencies**:
```python
# requirements.txt
fastapi==0.104.1
uvicorn==0.24.0
scikit-learn==1.3.2
youtube-transcript-api==0.6.1
groq==0.4.0
pydantic==2.5.0
python-dotenv==1.0.0
```

**Project Structure**:
```
ai-service/
├── main.py
├── services/
│   ├── plagiarism.py
│   ├── question_generator.py
│   └── grader.py
├── models/
│   └── schemas.py
├── utils/
│   └── groq_client.py
├── requirements.txt
└── .env
```

**main.py**:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services.plagiarism import check_plagiarism
from services.question_generator import generate_question
from services.grader import grade_defense

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://orbit-api.onrender.com"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

@app.post("/plagiarism-check")
async def plagiarism_check(data: dict):
    return check_plagiarism(data["userSummary"], data["videoTranscript"])

@app.post("/generate-question")
async def question_generation(data: dict):
    return generate_question(data["taskTitle"], data["userSummary"])

@app.post("/grade-defense")
async def defense_grading(data: dict):
    return grade_defense(data["question"], data["userDefense"], data["taskContext"])
```

**Deployment**: Render (Python service)

## 6. Security & Error Handling

### 6.1 Authentication
- JWT tokens with 24-hour expiry
- Bcrypt password hashing (10 rounds)
- Protected routes with middleware

### 6.2 API Security
- CORS configured for specific origins
- Rate limiting (100 requests/minute per IP)
- Input validation with Joi/Pydantic
- API keys in environment variables

### 6.3 Error Handling
- Try-catch blocks in all async operations
- Retry logic for external APIs (3 attempts, exponential backoff)
- User-friendly error messages
- Logging with Winston/Python logging

## 7. Performance Optimization

### 7.1 Caching
- YouTube video metadata cached in MongoDB
- Video transcripts cached after first fetch
- Groq responses not cached (need fresh questions)

### 7.2 Database Optimization
- Indexes on frequently queried fields
- Denormalized userId in tasks for faster queries
- Pagination for course/task lists

### 7.3 API Optimization
- Groq API: Ultra-fast inference (<3s)
- FastAPI: Async endpoints for concurrency
- YouTube API: Batch requests where possible

## 8. Monitoring & Logging

### 8.1 Logging
- Node.js: Winston logger (info, warn, error)
- FastAPI: Python logging module
- Log all API calls with timestamps
- Log plagiarism scores and AI verdicts

### 8.2 Monitoring
- Render: Built-in metrics (CPU, memory, response time)
- MongoDB Atlas: Query performance monitoring
- Custom metrics: Course completion rate, average defense time

## 9. Testing Strategy

### 9.1 Backend Testing
- Unit tests: Jest for controllers and services
- Integration tests: Supertest for API endpoints
- Mock external APIs (Groq, YouTube, S3)

### 9.2 Frontend Testing
- Component tests: React Testing Library
- E2E tests: Playwright for critical flows
- Timer accuracy tests

### 9.3 AI Microservice Testing
- Unit tests: pytest for plagiarism detection
- Mock Groq API responses
- Test edge cases (empty summaries, timeout scenarios)

## 10. Deployment Checklist

### 10.1 Environment Setup
- [ ] Create MongoDB Atlas cluster
- [ ] Get Groq API key
- [ ] Get YouTube Data API v3 key
- [ ] Create AWS S3 bucket
- [ ] Set up IAM user for S3 access
- [ ] Configure all environment variables

### 10.2 Service Deployment
- [ ] Deploy FastAPI to Render (Python service)
- [ ] Deploy Node.js to Render (Node.js service)
- [ ] Deploy React to Vercel
- [ ] Configure custom domains (optional)
- [ ] Test end-to-end flow

### 10.3 Post-Deployment
- [ ] Monitor logs for errors
- [ ] Test plagiarism detection accuracy
- [ ] Verify S3 passport uploads
- [ ] Check API response times
- [ ] Set up alerts for critical failures
