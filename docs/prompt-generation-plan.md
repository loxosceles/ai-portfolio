# Conversation-Aware AI Advocate System

This document outlines the plan for implementing a conversation-aware AI advocate system that eliminates repetitive responses and creates natural, contextual conversations with recruiters.

## Problem Statement

The current AI advocate system has several critical issues:

1. **Repetitive responses**: The AI falls back to the same base information regardless of question context
2. **Robotic conversations**: Lacks conversational memory and context awareness
3. **Poor user experience**: Recruiters receive identical information repeatedly
4. **No conversation continuity**: Each question is treated in isolation

## Solution Overview

We'll implement a conversation-aware system that:

1. **Stores conversation history** in the RecruiterProfile table
2. **Prevents repetitive responses** through dynamic prompt generation
3. **Maintains conversation context** across sessions
4. **Provides natural conversation flow** with memory of previous interactions
5. **Enables analytics** on recruiter interests and conversation patterns

## Architecture Decision: Backend-Only State Management

**Key Principle**: The frontend remains stateless. All conversation state is managed by the Lambda function.

**Flow**:

1. Frontend sends question via GraphQL
2. Lambda loads conversation history from RecruiterProfile
3. Lambda generates contextual response with anti-repetition rules
4. Lambda saves updated conversation history
5. Frontend receives response (no state management required)

**Benefits**:

- Simplified frontend architecture
- Automatic persistence across sessions
- Atomic operations per request
- Natural integration with existing auth flow

## Database Design: Extended RecruiterProfile

**Decision**: Extend the existing RecruiterProfile table rather than creating a separate ConversationHistory table.

**Rationale**:

- Conversation history is inherently tied to a specific recruiter session
- Simpler data model with fewer joins
- Easier analytics and conversation reset per recruiter
- Natural fit with existing linkId-based architecture

**Extended Schema**:

```typescript
interface RecruiterProfile {
  // ... existing fields
  conversationHistory?: ConversationMessage[];
  lastInteractionAt?: number;
  conversationStartedAt?: number;
  topicsCovered?: string[];
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  topicsCovered?: string[];
}
```

## Implementation Stages

### Stage 1: Conversation Persistence + Anti-Repetition (Combined)

**Goal**: Eliminate robotic responses through conversation awareness

**Why Combined**: These features are tightly coupled - storing history without using it provides no immediate value.

**Implementation**:

1. Extend RecruiterProfile table schema
2. Modify AI advocate Lambda to load/save conversation history
3. Integrate conversation context into prompt generation
4. Implement anti-repetition rules in prompt
5. Add conversation reset endpoint

**Key Features**:

- Persistent conversation across sessions
- Dynamic prompt includes conversation context
- Rule: "Never repeat information already discussed unless specifically requested"
- Topic tracking prevents redundant information sharing
- Backend-only state management

**Technical Details**:

```javascript
// Lambda function flow
async function handleAIQuestion(event) {
  const { question, linkId } = event.arguments;

  // Load recruiter profile (includes conversation history)
  const recruiterProfile = await getRecruiterProfile(linkId);

  // Generate response with full context
  const response = await generateContextualResponse(question, recruiterProfile);

  // Update conversation history
  const updatedHistory = [
    ...(recruiterProfile.conversationHistory || []),
    { role: 'user', content: question, timestamp: Date.now() },
    { role: 'assistant', content: response, timestamp: Date.now() }
  ];

  // Save updated profile
  await updateRecruiterProfile(linkId, {
    conversationHistory: updatedHistory,
    lastInteractionAt: Date.now(),
    conversationStartedAt: recruiterProfile.conversationStartedAt || Date.now()
  });

  return { response };
}
```

**Prompt Composition Strategy**:

```javascript
function buildContextualPrompt(question, recruiterProfile, developerData) {
  const history = recruiterProfile.conversationHistory || [];
  const conversationContext = buildConversationContext(history);

  return `
    ${buildRecruiterContext(recruiterProfile)}
    ${conversationContext}
    
    CONVERSATION RULES:
    - Never repeat information already shared unless specifically requested
    - Build upon previous context naturally
    - If returning after a break (>1 hour), acknowledge the gap warmly
    
    Question: "${question}"
    
    ${buildDeveloperContext(developerData)}
    
    Keep responses professional, concise (around 150 words), and conversational.
  `;
}
```

### Stage 2: Smart Session Management

**Goal**: Natural conversation flow across sessions

**Implementation**:

1. Conversation resumption with context summary
2. Intelligent session gap handling (>1 hour)
3. Enhanced "welcome back" messages
4. Conversation reset functionality

**Key Features**:

- "Welcome back" messages: "Nice to see you again. I remember we were talking about [topic] last time. What's on your mind today?"
- Automatic context refresh for long gaps
- Manual conversation reset option
- Session continuity indicators

**Technical Details**:

```javascript
function buildConversationContext(history) {
  if (!history || history.length === 0) {
    return 'This is the start of our conversation.';
  }

  const recentTopics = extractRecentTopics(history);
  const lastInteraction = history[history.length - 1];
  const timeSinceLastMessage = Date.now() - lastInteraction.timestamp;

  if (timeSinceLastMessage > 3600000) {
    // 1 hour
    return `
      CONVERSATION CONTEXT: We previously discussed: ${recentTopics.join(', ')}.
      It's been a while since our last conversation - greet them warmly and reference our previous discussion.
    `;
  }

  return `
    CONVERSATION CONTEXT: In this conversation we have already covered: ${recentTopics.join(', ')}.
    Build upon this context naturally without repeating the same information.
  `;
}
```

### Stage 3: Analytics & Optimization

**Goal**: Business intelligence and conversation optimization

**Implementation**:

1. Conversation analytics dashboard
2. Topic popularity tracking
3. Response effectiveness metrics
4. Recruiter interest patterns

**Key Features**:

- Most discussed topics across all conversations
- Average conversation length and engagement
- Popular question patterns
- Recruiter interest heatmaps
- Conversation quality metrics

**Analytics Queries**:

- What topics do recruiters ask about most?
- How long do conversations typically last?
- Which responses lead to follow-up questions?
- What skills generate the most interest?

## Performance Considerations

### Conversation History Growth Management

- **History Trimming**: Keep last 20 exchanges per conversation
- **Compression**: Summarize older messages to preserve context
- **DynamoDB Limits**: Monitor item size (400KB limit)
- **Pagination**: Implement if history becomes very large

### Caching Strategy

- **Static Data**: Cache developer profile and recruiter context in Lambda memory
- **Dynamic Data**: Always load fresh conversation history
- **Hybrid Approach**: Cached base prompt + dynamic conversation context

### Prompt Composition Optimization

```javascript
// Efficient prompt composition
async function generateContextualPrompt(question, linkId) {
  // STATIC (cache-friendly): Load once per conversation
  const [developerData, recruiterProfile] = await Promise.all([
    getDeveloperData(), // Can be cached
    getRecruiterProfile(linkId) // Base profile can be cached
  ]);

  // DYNAMIC (per message): Extract conversation history
  const conversationHistory = recruiterProfile.conversationHistory || [];

  // Compose prompt with conversation context
  return buildPrompt({
    static: { developerData, recruiterProfile },
    dynamic: { question, conversationHistory }
  });
}
```

## Integration with Existing Systems

### Prompt Caching Compatibility

The conversation system works alongside existing prompt caching:

- **Base prompt components** (developer data, recruiter context) remain cached
- **Conversation context** is dynamically added per request
- **No conflicts** with existing caching mechanisms

### Authentication Flow

- Uses existing JWT-based authentication
- Leverages linkId for recruiter identification
- No changes required to auth flow

### Frontend Integration

- **Minimal changes**: Frontend continues to send questions and receive responses
- **No state management**: All conversation state handled by backend
- **Existing UI**: Works with current chat interface

## Migration Strategy

### Phase 1: Schema Extension

1. Add new fields to RecruiterProfile table
2. Deploy infrastructure changes
3. Ensure backward compatibility

### Phase 2: Lambda Updates

1. Update AI advocate function with conversation logic
2. Deploy with feature flag for gradual rollout
3. Monitor performance and accuracy

### Phase 3: Full Activation

1. Enable conversation features for all users
2. Monitor conversation quality
3. Gather feedback and iterate

## Testing Strategy

### Unit Tests

- Conversation history management
- Prompt generation with context
- Anti-repetition logic
- Session gap detection

### Integration Tests

- End-to-end conversation flow
- Cross-session continuity
- Performance under load
- DynamoDB operations

### User Acceptance Testing

- Conversation quality assessment
- Repetition detection
- Natural flow evaluation
- Recruiter feedback collection

## Success Metrics

### Primary Metrics

- **Repetition Reduction**: Measure decrease in repeated information
- **Conversation Length**: Track engagement through longer conversations
- **User Satisfaction**: Recruiter feedback on conversation quality

### Secondary Metrics

- **Response Time**: Maintain sub-2-second response times
- **Conversation Completion**: Track full conversation cycles
- **Topic Coverage**: Measure breadth of topics discussed

## Future Enhancements

### Advanced Features (Post-Stage 3)

- **Conversation Summarization**: AI-generated conversation summaries
- **Proactive Suggestions**: AI suggests relevant topics based on recruiter profile
- **Multi-Modal Responses**: Include relevant portfolio links or examples
- **Conversation Templates**: Pre-built conversation flows for common scenarios

### Analytics Evolution

- **Predictive Analytics**: Predict recruiter interests based on conversation patterns
- **A/B Testing**: Test different conversation strategies
- **Personalization**: Adapt conversation style to recruiter preferences

## Cost Analysis

### Additional Costs

- **DynamoDB**: Minimal increase for conversation history storage (~$0.25 per million reads)
- **Lambda**: Slight increase in execution time for history processing
- **No new infrastructure**: Uses existing services

### Cost Optimization

- **History Trimming**: Prevents unbounded storage growth
- **Efficient Queries**: Minimize DynamoDB operations
- **Caching**: Reduce redundant data fetching

## Conclusion

This conversation-aware AI advocate system addresses the core problem of repetitive, robotic responses while maintaining the simplicity and performance of the existing architecture. The incremental implementation approach allows for controlled rollout and continuous improvement based on real-world usage patterns.

The backend-only state management approach ensures frontend simplicity while providing powerful conversation capabilities that will significantly improve the recruiter experience and provide valuable business intelligence.
