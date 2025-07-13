# Phase 1: Data Foundation (MVP)
## Product Requirements

The first version of the product should include a web interface that allows a user to:
    - Create an account using Auth0 authentication (supports social logins like Facebook, Google, and email/password).
    - New User Journey: Splash -> Sign Up -> Verify -> Complete New User Wizard -> Land on Dashboard
    - After login, whether new user or existing user who has not completed the wizard, begin the wizard:
        - Wizard Step 1: Investor Information
            - First Name
            - Last Name
            - Birth Date (for age-appropriate content and compliance)
            - Investor Type (Beginner, Novice, Pro, Veteran)
            - Ask for a list of news topics that they are interested in. (Free type, tag format)
            - Update the user record to mark the wizard as completed once this data is saved.
            - Once saved, navigate to the 'Daily Briefing' Dashboard
    - See a 'Daily Briefing' Dashboard
        - Recent news related to saved topics (if user has topics saved)
        - If no saved topics, show recent news from all assets
        - Display news items with company ticker, headline, sentiment score, and timestamp
        - Allow users to click on news items to view full article or related asset profile
        - Show a summary of market activity (number of assets with news, overall sentiment trend)
        - Include quick access to recently viewed assets
    - Search for 'Assets' (Stocks) by ticket or company name -> View List -> Click into Asset Profile
    - The search field should be in the upper right, in the header.
    - The Search should be a auto-complete to navigate directly to an Asset Profile if one is found in auto-complete by ticker symbol directly. If not found, we can do a deeper search oftickers, company names and descriptions and show a list of fuzzy results.
    - The Asset Profile contains:
        - Basic Company Info (name, sector, market cap, description)
        - Key Financial Metrics (P/E ratio, Revenue, current stock price)
        - Recent News (last 10 news items with sentiment scores)
        - Quick stats summary (52-week high/low, volume, etc.)

## Technical Requirements

### Hosting

AWS will be used, deployed with CDK. Create a new VPC within the stack, with appropriate subnets for public and private resources. The stack should include:
    - VPC with public and private subnets across multiple availability zones
    - Lambda functions for all serverless compute requirements
    - API Gateway for RESTful API endpoints
    - DynamoDB for all long-term data storage (user data, asset metadata, financial data, time-series data, analysis results)
    - S3 for static assets, data backups, and raw API responses
    - CloudFront for content delivery and caching
    - Route 53 for DNS management
    - EventBridge for event-driven architecture
    - Step Functions for complex workflows (if needed) 

### User Authentication

- We will use Auth0 for user authentication and authorization
- Auth0 will handle:
    - Social login providers (Google, Facebook, etc.)
    - Email/password authentication
    - Multi-factor authentication (MFA)
    - User profile management
    - JWT token generation and validation
- Integration requirements:
    - Auth0 SDK integration in React frontend
    - JWT token validation in API Gateway/Lambda functions
    - User profile synchronization with internal user database
    - Role-based access control (RBAC) for different investor types

### CI/CD & Testing

Gitlab pipelines will be used with comprehensive testing requirements. The repo should have a 'main' branch and a 'test' branch. The pipeline config will deploy the test branch to a 'test' stack that we can use for testing feature changes. The main branch will deploy (via CDK) to the production copy of the stack.

#### Pipeline Stages
- **Test Stage**: Run all unit tests, integration tests, and code quality checks
- **Build Stage**: Build application artifacts and infrastructure code
- **Deploy Stage**: Deploy to test/production environments

#### Testing Requirements
- **Unit Testing**: 100% unit test coverage required for all Lambda functions, API endpoints, and business logic
- **Integration Testing**: Test API integrations with external services (AlphaVantage, Alpaca, Auth0)
- **Frontend Testing**: Unit tests for React components and integration tests for user workflows
- **Infrastructure Testing**: CDK unit tests and integration tests for AWS resource creation
- **Data Validation Testing**: Tests for data quality, validation, and transformation logic
- **Security Testing**: Automated security scans and vulnerability assessments

#### Testing Tools & Frameworks
- **Backend**: Jest for Lambda function testing, AWS SDK mocks for AWS service testing
- **Frontend**: Jest + React Testing Library for component and integration testing
- **API Testing**: Supertest for API endpoint testing, Postman collections for manual testing
- **Infrastructure**: CDK assertions for infrastructure testing
- **Code Quality**: ESLint, Prettier, SonarQube for code quality and coverage reporting

#### Pipeline Requirements
- All tests must pass before deployment to any environment
- Code coverage reports must be generated and maintained
- Automated security scanning must pass before deployment
- Infrastructure changes must be validated through CDK testing
- Rollback procedures must be tested and documented

### Goal

The first version of the product will focus largely on ingestion and population of data, providing a bedrock of information to build other features on. Pollenation refers to making sure that we have collected all the 3rd party data, and then put a timestamp on that action. Pollenation takes an 'oldest first' method where it pollenates data for assets that are most stale. Pollenation understands changes vs deltas so that if new data has been added for an asset, the trigger event that is mentioned below will be dispatched.
    - Work within API rate limits. As of the time of planning, we are using a paid Alpaca API key, but the AlphaVantage key is on a free account and has rate limits. We must operate within rate limits but the system must easily expand to account for a higher rate limit in the future.
    - Provide integration with AlphaVantage API `https://www.alphavantage.co/documentation/`
    - Provide integration with Alpaca API `https://github.com/alpacahq/typescript-sdk`
    - Alpaca: Daily Cron to pollenate Assets
    - Alphavantage: Daily Cron to pollenate Earnings Calendar for all assets
    - AlphaVantage: Daily Cron to pollenate fundamental data
        - Company Overviews
        - Income Statements
        - Balance Sheets
        - Cash Flow
        - Earnings
        - News/Sentiment
    - AlphaVantage: Daily Cron to process new earnings reports based on Earnings Calendar release dates
    - When pollination or any other action causes data to be changed for an asset, an event should be dispatched that will trigger AI enhancement for that asset.

### Data Architecture
    - DynamoDB for all long-term data storage:
        - User data and profiles
        - Asset metadata and company information
        - Financial data (income statements, balance sheets, cash flow, earnings)
        - Time-series data (stock prices, news sentiment, analysis results)
        - Analysis results and ratings
    - S3 for raw API responses and data backups
    - EventBridge for orchestrating data pipeline and analysis triggers
    - CloudWatch for monitoring and alerting

#### Frontend Architecture
    - React/TypeScript application deployed to S3 and served via CloudFront
    - Auth0 for user authentication and authorization
    - Responsive design supporting desktop and mobile devices
    - Progressive Web App (PWA) capabilities for offline functionality

#### Security
    - API keys stored in AWS Secrets Manager
    - VPC endpoints for AWS services to avoid internet exposure
    - WAF for API Gateway protection
    - Encryption at rest and in transit for all data
    - IAM roles with least privilege access
    - Auth0 JWT token validation for all API endpoints
    - CORS configuration for Auth0 domains
    - Regular security scanning and vulnerability assessments

#### Performance Requirements
    - API response times under 200ms for cached data
    - Page load times under 3 seconds for initial load
    - Support for 1000+ concurrent users
    - Lambda auto-scaling based on demand
    - CDN caching for static assets and API responses
    - DynamoDB on-demand capacity for unpredictable workloads
    - DynamoDB DAX (DynamoDB Accelerator) for frequently accessed data