export const projectDetails = {
  'ai-portfolio': {
    slug: 'ai-portfolio',
    content: `# AI Portfolio Frontend - Detailed Overview

## Project Summary

The AI Portfolio Frontend is a modern, serverless web application that showcases a developer's professional profile with AI-powered personalization features. It uses a combination of Next.js for the frontend and AWS services for the backend, creating a seamless, dynamic portfolio experience that adapts to each visitor.

## Key Features

### 1. AI-Powered Personalization
- **Personalized Greetings**: AI-generated introductions based on the visitor's company and role
- **Job Matching**: Automatically highlights relevant skills and projects based on job descriptions
- **AI Q&A System**: Allows visitors to ask questions about the developer's experience using Amazon Bedrock

### 2. Unique Link Generation
- **Company-specific URLs**: Each recruiter gets a unique link with their company context
- **Context Preservation**: The system remembers who is visiting and customizes content accordingly
- **Analytics**: Tracks link usage and engagement metrics

### 3. Cost-Optimized Serverless Architecture
- **Static S3 Deployment**: Frontend assets hosted on S3 with near-zero storage costs
- **Global Content Delivery**: CloudFront CDN with pay-per-request pricing model
- **Serverless Backend**: Lambda functions and AppSync that only incur costs when used
- **Estimated Monthly Cost**: Less than $5/month for typical portfolio usage patterns

### 4. Invisible Authentication & Security
- **Tokenized Links**: Each personalized URL contains a secure token tied to a virtual Cognito user
- **Content Isolation**: Visitors can only access personalized content intended specifically for them
- **Tamper-Proof Design**: URL manipulation is prevented through backend authentication checks
- **Seamless Experience**: Security measures operate invisibly with no login screens or credentials`
  },
  'image-processor': {
    slug: 'image-processor',
    content: `# Image Processor - Technical Portfolio Documentation

## Project Overview

The Image Processor is a production-ready Python application designed to handle batch image processing operations with enterprise-level reliability and performance. Built with modern development practices, it demonstrates proficiency in concurrent programming, containerization, and robust software architecture.

## Problem Statement & Solution

**Challenge**: Processing large batches of images manually is time-consuming and resource-intensive. Many existing tools lack proper EXIF handling, concurrent processing, or containerized deployment options.

**Solution**: A containerized CLI tool that processes images concurrently while preserving metadata, with support for multiple transformation operations and a complete development/deployment pipeline.

## Key Technical Features

**Concurrent Processing**
- Utilizes thread-based concurrency for I/O-bound image operations
- Significantly reduces processing time for large batches
- Scales with available CPU cores

**EXIF-Aware Rotation**
- Intelligent image rotation based on EXIF orientation tags
- Preserves original metadata while correcting display orientation
- Handles edge cases with missing or corrupted EXIF data

**Error Resilience**
- Graceful error handling prevents single image failures from stopping batch processing
- Comprehensive logging and user feedback
- Input validation for supported formats

## Technology Stack
- **Python 3.11+**: Modern Python with type hints and async capabilities
- **Pillow (PIL)**: Industry-standard image processing library
- **Docker**: Containerization with Alpine Linux for minimal footprint
- **pytest**: Comprehensive test suite with fixtures and parametrized tests`
  },
  web3snapshot: {
    slug: 'web3snapshot',
    content: `# Web3 Snapshot Dashboard - Technical Portfolio Documentation

## Project Overview

The Web3 Snapshot Dashboard is a production-ready full-stack application that provides real-time cryptocurrency market analysis and visualization. Built with modern web technologies and containerized architecture, it demonstrates expertise in real-time data processing, microservices design, and responsive web development.

## Problem Statement & Solution

**Challenge**: Cryptocurrency markets move rapidly with constant price fluctuations and market cap changes. Traders and investors need real-time access to comprehensive market data, tokenomics analysis, and historical trends in an easily digestible format.

**Solution**: A containerized dashboard application that fetches live data from CoinGecko API, processes complex financial calculations, and delivers real-time updates through Server-Sent Events with an intuitive React interface.

## Key Technical Features

**Real-Time Data Streaming**
- Server-Sent Events for real-time market data updates without polling overhead
- Redis pub/sub messaging system for live updates
- Intelligent data diffing to minimize unnecessary updates

**Intelligent Data Processing**
- Automated MC/FDV ratio calculations for tokenomics analysis
- Percentage change computations across multiple timeframes
- Data normalization and diff algorithms to optimize cache updates

**Responsive Component Architecture**
- Modular React components with state management via Zustand
- Custom hooks for scroll locking and iframe detection
- Mobile-responsive design with breakpoint management

## Technology Stack
- **React 18**: Modern functional components with hooks and context
- **Flask 3.0**: Lightweight Python web framework
- **Redis 7.2**: In-memory caching and pub/sub messaging
- **Docker**: Multi-stage containerization with Alpine Linux
- **SQLite**: Embedded database for persistent storage`
  }
};

export function getProjectDetail(slug: string) {
  return projectDetails[slug as keyof typeof projectDetails];
}

export function getProjectSlugs() {
  return Object.keys(projectDetails);
}
