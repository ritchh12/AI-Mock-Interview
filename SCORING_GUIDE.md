# AI Mock Interview App - Scoring System

## Overview
This app uses AI-powered evaluation to score interview responses and provide feedback. The scoring system has built-in fallbacks to ensure users always receive scores, even if AI services are unavailable.

## How Scoring Works

### 1. AI-Powered Scoring (Primary Method)
- Uses OpenAI's GPT model to evaluate answers
- Provides scores on a 1-10 scale
- Generates detailed, personalized feedback
- Considers question type, expected answers, and response quality

### 2. Fallback Scoring (Backup Method)
- Activates when AI services are unavailable or not configured
- Provides basic scoring based on:
  - Answer length and completeness
  - Question type difficulty
  - Response structure
- Ensures users always receive feedback

## Configuration

### Required Environment Variables
```
CONVEX_OPENAI_API_KEY=your-openai-api-key
CONVEX_OPENAI_BASE_URL=https://api.openai.com/v1
```

### Without AI Configuration
- App will use fallback scoring automatically
- Users will still receive scores and basic feedback
- Performance is not degraded

## Troubleshooting

### "N/A" Scores Issue
If you see "N/A" instead of scores:

1. **Check Configuration**: Ensure OpenAI API key is set in environment variables
2. **Use Retry Button**: Click "Regenerate Scores" on the results page
3. **Wait for Processing**: AI evaluation runs asynchronously - wait a few moments
4. **Refresh Page**: Scores update automatically, refresh to see latest results

### Manual Score Regeneration
- Available on the results page when scores are missing
- Retries evaluation for all unanswered questions
- Regenerates overall feedback

## Technical Details

### Scoring Flow
1. User submits answer → Response saved immediately
2. AI evaluation scheduled (runs in background)
3. Score and feedback saved to database
4. Results page displays updated scores
5. Overall feedback generated after all questions

### Error Handling
- Failed AI calls trigger fallback scoring
- Network issues don't prevent score generation
- Comprehensive logging for debugging
- Graceful degradation ensures user experience

## Score Calculation

### AI Scoring Criteria
- Technical accuracy and depth
- Communication clarity
- Problem-solving approach
- Relevant examples and experience
- Question-specific requirements

### Fallback Scoring Logic
- 1-3: No answer or very brief response
- 4-5: Basic answer with minimal detail
- 6-7: Good answer with adequate detail
- 8-10: Comprehensive answer with examples

## Support
If you continue to experience scoring issues:
1. Check browser console for error messages
2. Verify Convex deployment is active
3. Ensure environment variables are properly set
4. Use the retry functionality on results page
