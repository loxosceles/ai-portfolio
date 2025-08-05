export const projectDetails = {
  'ai-portfolio': {
    slug: 'ai-portfolio',
    title: 'AI Portfolio Frontend',
    overview:
      "A modern, serverless web application that showcases a developer's professional profile with AI-powered personalization features using Next.js and AWS services.",
    challenge:
      'Creating personalized portfolio experiences for recruiters while maintaining cost-effective serverless architecture and seamless user experience.',
    solution:
      'Next.js frontend with AWS services backend, featuring AI-powered personalization, invisible authentication, and multi-region deployment strategy.',
    techStack: [
      'Next.js',
      'TypeScript',
      'AWS AppSync',
      'AWS Lambda',
      'DynamoDB',
      'Amazon Bedrock',
      'CloudFront',
      'S3',
      'Cognito',
      'CDK'
    ],
    architecture: [
      {
        component: 'Frontend Architecture',
        details:
          'Next.js with React 19, TypeScript, Apollo Client for GraphQL, TailwindCSS for styling, and centralized auth context'
      },
      {
        component: 'Backend Architecture',
        details:
          'AWS AppSync GraphQL API, Lambda resolvers, DynamoDB storage, Amazon Bedrock AI integration, S3 & CloudFront hosting'
      },
      {
        component: 'Infrastructure as Code',
        details:
          'AWS CDK multi-stack approach with environment-based deployments and automated CI/CD pipeline'
      }
    ],
    codeExample: {
      title: 'AI-Powered Personalization',
      code: `// Centralized auth context with environment detection
const { getQueryContext } = useAuth();

const { data } = useQuery(GET_PERSONALIZED_CONTENT, {
  context: getQueryContext('authenticated'),
  variables: { recruiterId, jobContext }
});

// AI-generated content using Bedrock
const personalizedGreeting = await bedrock.invoke({
  modelId: 'anthropic.claude-v2',
  body: JSON.stringify({
    prompt: \`Generate personalized greeting for \${company} recruiter\`,
    max_tokens: 200
  })
});`
    },
    patterns: [
      'Serverless Architecture: Pay-per-use model with Lambda, AppSync, and DynamoDB',
      'Event-Driven Design: AI processing triggered by recruiter interactions',
      'Multi-Region Strategy: Frontend in US, backend in EU for data residency'
    ],
    performance: [
      'Cost optimization: <$5/month operational costs',
      'Global CDN: CloudFront distribution for sub-100ms response times',
      'Serverless scaling: Auto-scaling from 0 to handle traffic spikes'
    ],
    highlights: [
      'AI-powered content personalization with Amazon Bedrock',
      'Invisible authentication using virtual Cognito users',
      'Multi-region serverless architecture',
      'Comprehensive CI/CD with environment management'
    ]
  },
  'image-processor': {
    slug: 'image-processor',
    title: 'Image Processor CLI',
    overview:
      'A production-ready Python application for batch image processing with enterprise-level reliability, concurrent processing, and containerized deployment.',
    challenge:
      'Processing large image batches manually is time-consuming, lacks proper EXIF handling, concurrent processing, and containerized deployment options.',
    solution:
      'Containerized CLI tool with ThreadPoolExecutor concurrency, EXIF metadata preservation, and complete development/deployment pipeline.',
    techStack: [
      'Python 3.11+',
      'Pillow (PIL)',
      'piexif',
      'Docker',
      'Alpine Linux',
      'pytest',
      'ThreadPoolExecutor',
      'tqdm',
      'uv'
    ],
    architecture: [
      {
        component: 'Processing Engine',
        details:
          'Concurrent image processing using ThreadPoolExecutor with support for JPEG/PNG formats and EXIF metadata handling'
      },
      {
        component: 'CLI Interface',
        details:
          'Argument parsing with argparse, input validation, error handling, and flexible task selection system'
      },
      {
        component: 'Container Infrastructure',
        details:
          'Multi-stage Docker build using uv package manager with development and production configurations'
      }
    ],
    codeExample: {
      title: 'Concurrent Processing Implementation',
      code: `# Concurrent image processing with error resilience
with ThreadPoolExecutor() as executor:
    jobs = [executor.submit(process_function, input_path, output_path)
            for input_path, output_path in image_pairs]
    
    for job in tqdm(as_completed(jobs), total=len(jobs)):
        try:
            result = job.result()
            logger.info(f"Processed: {result}")
        except Exception as e:
            logger.error(f"Processing failed: {e}")
            # Continue processing other images`
    },
    patterns: [
      'Command Pattern: Each operation (resize, blur, rotate) implements consistent interface',
      'Factory Pattern: Task selection maps string commands to processing functions',
      'Pipeline Pattern: Validation → Processing → Output with error handling'
    ],
    performance: [
      'Thread-based parallelism scales with available CPU cores',
      'Memory efficiency: processes images individually to avoid bloat',
      'Container optimization: multi-stage builds reduce deployment time'
    ],
    highlights: [
      'Concurrent batch processing with ThreadPoolExecutor',
      'EXIF-aware rotation with metadata preservation',
      'Production-ready containerization with Alpine Linux',
      'Comprehensive test suite with parametrized tests'
    ]
  },
  web3snapshot: {
    slug: 'web3snapshot',
    title: 'Web3 Snapshot Dashboard',
    overview:
      'A production-ready full-stack application providing real-time cryptocurrency market analysis with microservices architecture and Server-Sent Events.',
    challenge:
      'Cryptocurrency markets move rapidly requiring real-time data access, comprehensive tokenomics analysis, and historical trends in digestible format.',
    solution:
      'Containerized dashboard with live CoinGecko API integration, Redis pub/sub messaging, Server-Sent Events, and responsive React interface.',
    techStack: [
      'React 18',
      'Flask 3.0',
      'Redis 7.2',
      'Docker',
      'SQLite',
      'Nginx',
      'Gunicorn',
      'Zustand',
      'SCSS',
      'pytest'
    ],
    architecture: [
      {
        component: 'Frontend (React SPA)',
        details:
          'React 18 with functional components, SCSS styling, real-time updates via Server-Sent Events, interactive tables with sorting/filtering'
      },
      {
        component: 'Backend API (Flask)',
        details:
          'RESTful API with Redis caching, real-time streaming endpoints, pub/sub messaging system, environment-specific configurations'
      },
      {
        component: 'Data Processing Engine',
        details:
          'Automated CoinGecko API fetching, MC/FDV calculations, intelligent data diffing, cron-based scheduling'
      },
      {
        component: 'Infrastructure',
        details:
          'Multi-container Docker architecture, Redis caching/pub-sub, SQLite database, Nginx reverse proxy with SSL/TLS'
      }
    ],
    codeExample: {
      title: 'Real-Time Data Streaming',
      code: `# Server-Sent Events implementation
@bp.route("/coin-stream", methods=["GET"])
def get_coin_stream():
    redis_conn = current_app.redis_conn
    pubsub = redis_conn.pubsub(ignore_subscribe_messages=True)
    pubsub.subscribe("coins")
    return Response(event_stream(redis_conn, pubsub), 
                   mimetype="text/event-stream")

# React real-time updates
const eventSource = new EventSource('/api/coin-stream');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateMarketData(data);
};`
    },
    patterns: [
      'Microservices Design: Separate containers for frontend, backend, caching, enabling independent scaling',
      'Event-Driven Architecture: Redis pub/sub decouples data processing from API responses',
      'Observer Pattern: Server-Sent Events allow multiple clients to receive real-time updates'
    ],
    performance: [
      'Redis caching with intelligent cache invalidation',
      'Data diffing algorithms reduce unnecessary database writes',
      'Server-Sent Events eliminate polling overhead'
    ],
    highlights: [
      'Real-time market data streaming with Server-Sent Events',
      'Microservices container architecture with service isolation',
      'Advanced caching strategies with Redis pub/sub',
      'Comprehensive testing with pytest and React Testing Library'
    ]
  }
};

export function getProjectDetail(slug: string): ProjectDetail | null {
  const detail = projectDetails[slug as keyof typeof projectDetails];
  return detail ?? null;
}

export function getProjectSlugs() {
  return Object.keys(projectDetails);
}

export type ProjectDetail = {
  slug: string;
  title: string;
  overview: string;
  challenge: string;
  solution: string;
  techStack: string[];
  architecture: {
    component: string;
    details: string;
  }[];
  codeExample: {
    title: string;
    code: string;
  };
  patterns: string[];
  performance: string[];
  highlights: string[];
};
