# Struct - Requirements Specification

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements for Struct, an AI-audited proof-of-work and active learning platform that verifies genuine coding skill development through AI-judged submissions and generates public Skill Passports.

### 1.2 Scope
Struct enables users to input technology learning goals, receive structured roadmaps, prove competency through code submissions evaluated by AI judges, and earn tamper-proof Skill Passports hosted on AWS infrastructure optimized for the Indian market.

### 1.3 Definitions
- **Roadmap**: A structured sequence of daily coding tasks generated from a user's learning goal
- **Task**: A single coding challenge within a roadmap that must be completed to unlock subsequent tasks
- **Proof-of-Work**: Raw code submitted by the user to demonstrate task completion
- **AI Judge**: The DeepSeek-Coder API that evaluates submissions and generates contextual questions
- **Defense**: User's answer to the follow-up question posed by the AI Judge
- **Skill Passport**: A static, publicly accessible HTML document that certifies completed roadmaps and tasks

## 2. Functional Requirements (EARS Notation)

### 2.1 User Goal Input

**REQ-001**: WHEN the user accesses the goal input interface, the system SHALL display a text input field for entering a technology learning goal.

**REQ-002**: WHEN the user submits a learning goal, the system SHALL validate that the input contains at least 3 characters.

**REQ-003**: IF the goal input is invalid, THEN the system SHALL display an error message indicating minimum length requirements.

**REQ-004**: WHEN a valid goal is submitted, the system SHALL send the goal text to the Planner API (DeepSeek-Chat).

### 2.2 Roadmap Generation

**REQ-005**: WHEN the Planner API receives a user goal, the system SHALL generate a structured JSON roadmap containing daily coding tasks.

**REQ-006**: WHERE the roadmap is generated, the system SHALL include for each task: task ID, title, description, difficulty level, estimated duration, and learning objectives.

**REQ-007**: WHEN the roadmap JSON is received from the Planner API, the system SHALL store it in MongoDB with user association.

**REQ-008**: WHEN storing the roadmap, the system SHALL initialize all tasks except the first as "locked" status.

**REQ-009**: WHEN the roadmap is successfully stored, the system SHALL display the roadmap to the user with visual lock indicators.

### 2.3 Task Progression

**REQ-010**: WHILE a task is locked, the system SHALL prevent the user from viewing task details or submitting code.

**REQ-011**: WHEN the user selects an unlocked task, the system SHALL display the full task description and code submission interface.

**REQ-012**: WHEN the user is viewing an unlocked task, the system SHALL provide a code editor or text area for raw code input.

**REQ-013**: WHEN the user submits code for a task, the system SHALL validate that the submission is not empty.

**REQ-014**: IF the code submission is empty, THEN the system SHALL display an error message and prevent submission.

### 2.4 AI Judge Evaluation

**REQ-015**: WHEN valid code is submitted, the system SHALL send the code to the Judge API (DeepSeek-Coder) along with task context.

**REQ-016**: WHEN the Judge API receives the submission, the system SHALL analyze the code for variable names, structure, and implementation patterns.

**REQ-017**: WHERE code analysis is complete, the system SHALL generate a contextual follow-up question specific to the user's implementation.

**REQ-018**: WHEN the follow-up question is generated, the system SHALL display it to the user and require a text response.

**REQ-019**: WHILE awaiting the user's defense answer, the system SHALL maintain the task in "under review" status.

### 2.5 Defense Verification

**REQ-020**: WHEN the user submits a defense answer, the system SHALL send both the original code and the answer to the Judge API.

**REQ-021**: WHEN the Judge API evaluates the defense, the system SHALL return a pass/fail verdict with reasoning.

**REQ-022**: IF the defense passes, THEN the system SHALL mark the current task as "completed" and unlock the next task in the roadmap.

**REQ-023**: IF the defense fails, THEN the system SHALL display the failure reason and allow the user to resubmit code.

**REQ-024**: WHEN a task is marked completed, the system SHALL update the task status in MongoDB.

**REQ-025**: WHEN the next task is unlocked, the system SHALL update its status to "unlocked" in MongoDB and refresh the UI.

### 2.6 User Progress Tracking

**REQ-026**: WHEN the user accesses their dashboard, the system SHALL display all active roadmaps with completion percentages.

**REQ-027**: WHERE multiple roadmaps exist, the system SHALL allow the user to switch between them.

**REQ-028**: WHEN viewing a roadmap, the system SHALL visually distinguish between locked, unlocked, under review, and completed tasks.

**REQ-029**: WHEN all tasks in a roadmap are completed, the system SHALL mark the roadmap as "finished" and trigger Skill Passport generation.

### 2.7 Skill Passport Generation

**REQ-030**: WHEN a roadmap is marked as "finished", the system SHALL automatically generate a Skill Passport document.

**REQ-031**: WHEN generating a Skill Passport, the system SHALL include: user name, roadmap title, completion date, list of completed tasks, and unique verification ID.

**REQ-032**: WHEN the Skill Passport is generated, the system SHALL upload it as a static HTML file to Amazon S3.

**REQ-033**: WHEN the Skill Passport is uploaded, the system SHALL set S3 object permissions to public-read.

**REQ-034**: WHEN the Skill Passport is stored, the system SHALL generate a CloudFront URL for global access.

**REQ-035**: WHEN the Skill Passport URL is created, the system SHALL store it in DynamoDB associated with the user and roadmap.

**REQ-036**: WHEN the user views their completed roadmap, the system SHALL display a shareable Skill Passport link.

**REQ-037**: WHERE a Skill Passport link is accessed, the system SHALL serve the static HTML via CloudFront with low latency.

**REQ-038**: WHEN a Skill Passport is viewed, the system SHALL display a verification ID that can be used to confirm authenticity.

### 2.8 Data Persistence

**REQ-039**: WHEN a user creates an account, the system SHALL store user credentials securely in Amazon DynamoDB.

**REQ-040**: WHEN user data is stored, the system SHALL hash passwords using bcrypt or equivalent.

**REQ-041**: WHEN a roadmap is created, the system SHALL store it in DynamoDB with user ID as partition key.

**REQ-042**: WHEN code submissions are made, the system SHALL store submission history in DynamoDB with timestamps.

**REQ-043**: WHERE submission history exists, the system SHALL allow users to view previous attempts.

**REQ-044**: WHEN Skill Passports are generated, the system SHALL store the HTML files in Amazon S3 with unique keys.

## 3. Non-Functional Requirements

### 3.1 Performance

**REQ-045**: WHEN the Planner API is called, the system SHALL return a roadmap within 15 seconds.

**REQ-046**: WHEN the Judge API evaluates code, the system SHALL return results within 10 seconds.

**REQ-047**: WHERE DynamoDB queries occur, the system SHALL respond within 500 milliseconds for 95% of requests.

**REQ-048**: WHEN static assets are requested, CloudFront SHALL deliver content with latency under 100ms for users in India.

### 3.2 Scalability

**REQ-049**: The system SHALL support unlimited concurrent users through AWS Lambda auto-scaling.

**REQ-050**: The system SHALL handle at least 1,000 API requests per minute to DeepSeek services.

**REQ-051**: WHEN traffic spikes occur, AWS Lambda SHALL automatically scale to handle increased load.

**REQ-052**: WHERE no requests are active, the system SHALL incur zero compute costs (serverless cold start acceptable).

### 3.3 Security

**REQ-053**: WHEN users authenticate, the system SHALL use JWT tokens with 24-hour expiration.

**REQ-054**: WHEN API keys are stored, the system SHALL use AWS Systems Manager Parameter Store or AWS Secrets Manager.

**REQ-055**: WHEN user data is transmitted, the system SHALL use HTTPS encryption via CloudFront and API Gateway.

**REQ-056**: WHEN Lambda functions access DynamoDB, the system SHALL use IAM roles with least-privilege permissions.

**REQ-057**: WHEN Skill Passports are stored in S3, the system SHALL prevent modification through S3 versioning and object lock.

### 3.4 Reliability

**REQ-058**: IF the Planner API fails, THEN the system SHALL retry up to 3 times with exponential backoff.

**REQ-059**: IF the Judge API fails, THEN the system SHALL display an error message and allow resubmission.

**REQ-060**: WHERE API failures occur, the system SHALL log errors to Amazon CloudWatch for debugging.

**REQ-061**: WHEN Lambda functions fail, the system SHALL log stack traces to CloudWatch Logs.

**REQ-062**: WHERE DynamoDB operations fail, the system SHALL implement automatic retry with exponential backoff.

### 3.5 Usability

**REQ-063**: The system SHALL provide visual feedback during API calls (loading indicators).

**REQ-064**: The system SHALL display clear error messages when operations fail.

**REQ-065**: The system SHALL be responsive and functional on desktop, tablet, and mobile devices.

**REQ-066**: WHEN users access the platform from Tier-2/3 cities in India, the system SHALL load within 3 seconds on 3G connections.

### 3.6 Maintainability

**REQ-067**: The system SHALL separate frontend and backend code into distinct repositories or directories.

**REQ-068**: The system SHALL use AWS Systems Manager Parameter Store for all configuration values.

**REQ-069**: The system SHALL include API documentation for all Lambda function endpoints.

**REQ-070**: WHEN Lambda functions are deployed, the system SHALL use AWS SAM or Serverless Framework for infrastructure as code.

## 4. System Constraints

**CON-001**: The system SHALL use AWS services exclusively for infrastructure (S3, CloudFront, Lambda, API Gateway, DynamoDB).

**CON-002**: The system SHALL use DeepSeek-Chat exclusively for roadmap planning.

**CON-003**: The system SHALL use DeepSeek-Coder exclusively for code evaluation.

**CON-004**: The system SHALL use Amazon DynamoDB as the primary database.

**CON-005**: The system SHALL use AWS Lambda for all backend compute operations.

**CON-006**: The system SHALL use free or open-weights AI APIs to maintain zero operational costs at scale.

**CON-007**: The system SHALL optimize for low-latency access across India (Bharat) using CloudFront edge locations.

## 5. AWS-Specific Requirements

### 5.1 Cost Optimization

**REQ-071**: WHEN no users are active, the system SHALL incur zero compute costs through serverless architecture.

**REQ-072**: WHEN Lambda functions execute, the system SHALL use the minimum memory allocation required (128MB-512MB).

**REQ-073**: WHERE possible, the system SHALL use AWS Free Tier resources (Lambda, DynamoDB, S3, CloudFront).

**REQ-074**: WHEN storing data in DynamoDB, the system SHALL use on-demand billing to avoid provisioned capacity costs.

### 5.2 Regional Optimization

**REQ-075**: WHEN deploying infrastructure, the system SHALL use AWS Asia Pacific (Mumbai) region as primary.

**REQ-076**: WHEN serving static content, CloudFront SHALL cache assets at edge locations across India.

**REQ-077**: WHERE latency is critical, the system SHALL use CloudFront's India-specific edge locations (Mumbai, Delhi, Chennai, Hyderabad).

### 5.3 Monitoring and Observability

**REQ-078**: WHEN Lambda functions execute, the system SHALL log all invocations to CloudWatch Logs.

**REQ-079**: WHEN errors occur, the system SHALL create CloudWatch alarms for critical failures.

**REQ-080**: WHERE performance degrades, the system SHALL track Lambda execution duration and DynamoDB latency metrics.

## 6. Future Enhancements (Out of Scope for v1.0)

- Social features (sharing roadmaps, leaderboards)
- Multiple programming language support
- Video explanations for tasks
- Peer review system
- Mobile native applications (React Native)
- Integration with GitHub for automatic code submission
- Blockchain-based Skill Passport verification
- AWS Cognito for advanced authentication
- Amazon SES for email notifications
