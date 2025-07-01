"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.CONVEX_OPENAI_BASE_URL,
  apiKey: process.env.CONVEX_OPENAI_API_KEY,
});

export const generateInterviewQuestions = internalAction({
  args: {
    interviewId: v.id("interviews"),
    jobRole: v.string(),
    difficulty: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
    totalQuestions: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if OpenAI is configured - if not, use enhanced fallback
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      console.log("OpenAI not configured, using enhanced fallback questions");
      await ctx.runMutation(internal.questions.createEnhancedDefaultQuestions, {
        interviewId: args.interviewId,
        jobRole: args.jobRole,
        difficulty: args.difficulty,
        totalQuestions: args.totalQuestions,
      });
      return;
    }

    const prompt = `Generate ${args.totalQuestions} interview questions for a ${args.difficulty} level ${args.jobRole} position. 

Include a mix of:
- Technical questions (40%)
- Behavioral questions (30%)
- Situational questions (20%)
- Coding questions (10%)

For each question, provide:
1. The question text
2. Question type (technical/behavioral/situational/coding)
3. Expected answer guidelines (brief)
4. Time limit in seconds (60-300 seconds based on complexity)

Format as JSON array with objects containing: questionText, questionType, expectedAnswer, timeLimit

Make questions realistic and relevant to ${args.jobRole} role.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content generated");
      }

      // Parse the JSON response
      const questions = JSON.parse(content);

      // Validate questions array
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error("Invalid questions format received");
      }

      // Save questions to database
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        await ctx.runMutation(internal.questions.saveQuestion, {
          interviewId: args.interviewId,
          questionText: question.questionText,
          questionType: question.questionType,
          difficulty: args.difficulty,
          order: i,
          expectedAnswer: question.expectedAnswer,
          timeLimit: question.timeLimit,
        });
      }

      console.log(`Successfully generated ${questions.length} AI questions for ${args.jobRole}`);
    } catch (error) {
      console.error("Error generating questions with AI:", error);
      // Fallback: create enhanced default questions
      await ctx.runMutation(internal.questions.createEnhancedDefaultQuestions, {
        interviewId: args.interviewId,
        jobRole: args.jobRole,
        difficulty: args.difficulty,
        totalQuestions: args.totalQuestions,
      });
    }
  },
});

export const evaluateAnswer = internalAction({
  args: {
    responseId: v.id("responses"),
    questionId: v.id("questions"),
    answer: v.string(),
  },
  handler: async (ctx, args) => {
    const question = await ctx.runQuery(internal.aiQueries.getQuestion, {
      questionId: args.questionId,
    });

    if (!question) {
      console.error("Question not found for evaluation:", args.questionId);
      return;
    }

    // Check if OpenAI is configured
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      console.error("OpenAI API key not configured, using fallback scoring");
      await ctx.runMutation(internal.aiQueries.updateResponseScore, {
        responseId: args.responseId,
        score: calculateFallbackScore(args.answer, question.questionType),
        feedback: generateFallbackFeedback(args.answer, question.questionType),
      });
      return;
    }

    const prompt = `Evaluate this interview answer on a scale of 1-10 and provide constructive feedback.

Question: ${question.questionText}
Question Type: ${question.questionType}
Expected Answer Guidelines: ${question.expectedAnswer || "General interview best practices"}

Candidate's Answer: ${args.answer}

Provide:
1. Score (1-10)
2. Brief feedback (2-3 sentences) highlighting strengths and areas for improvement

Format as JSON: {"score": number, "feedback": "string"}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content received from OpenAI");
      }

      const evaluation = JSON.parse(content);

      // Validate the response structure
      if (typeof evaluation.score !== 'number' || !evaluation.feedback) {
        throw new Error("Invalid evaluation format received");
      }

      await ctx.runMutation(internal.aiQueries.updateResponseScore, {
        responseId: args.responseId,
        score: Math.max(1, Math.min(10, evaluation.score)), // Ensure score is between 1-10
        feedback: evaluation.feedback,
      });

      console.log(`Successfully evaluated answer for response ${args.responseId}`);
    } catch (error) {
      console.error("Error evaluating answer:", error);
      
      // Fallback scoring when AI evaluation fails
      await ctx.runMutation(internal.aiQueries.updateResponseScore, {
        responseId: args.responseId,
        score: calculateFallbackScore(args.answer, question.questionType),
        feedback: generateFallbackFeedback(args.answer, question.questionType),
      });
    }
  },
});

// Fallback scoring function
function calculateFallbackScore(answer: string, questionType: string): number {
  if (!answer || answer.trim() === "" || answer.trim() === "No answer provided") {
    return 1;
  }
  
  const wordCount = answer.trim().split(/\s+/).length;
  const hasExamples = answer.toLowerCase().includes('example') || answer.toLowerCase().includes('instance') || answer.toLowerCase().includes('time when') || answer.toLowerCase().includes('experience');
  const hasNumbers = /\d/.test(answer);
  const hasSpecificTerms = answer.toLowerCase().match(/\b(implement|develop|design|manage|lead|create|build|analyze|optimize|solve)\b/);
  const hasSTARMethod = answer.toLowerCase().includes('situation') || (answer.toLowerCase().includes('task') && answer.toLowerCase().includes('action'));
  
  let baseScore = 4; // Start with below average
  
  // Adjust based on answer length
  if (wordCount < 10) {
    baseScore = 2;
  } else if (wordCount < 30) {
    baseScore = 4;
  } else if (wordCount < 80) {
    baseScore = 6;
  } else if (wordCount < 150) {
    baseScore = 7;
  } else {
    baseScore = 8;
  }
  
  // Question type specific adjustments
  switch (questionType) {
    case 'technical':
      if (hasSpecificTerms) baseScore += 1;
      if (hasNumbers) baseScore += 0.5;
      if (wordCount < 40) baseScore -= 1; // Technical questions need more detail
      break;
      
    case 'behavioral':
      if (hasExamples) baseScore += 1;
      if (hasSTARMethod) baseScore += 1;
      if (hasNumbers) baseScore += 0.5; // Quantified results
      if (wordCount < 50) baseScore -= 1; // Behavioral needs examples
      break;
      
    case 'situational':
      if (hasSpecificTerms) baseScore += 0.5;
      if (answer.toLowerCase().includes('would') || answer.toLowerCase().includes('approach')) baseScore += 0.5;
      if (wordCount < 40) baseScore -= 0.5;
      break;
      
    case 'coding':
      if (hasSpecificTerms) baseScore += 1;
      if (answer.toLowerCase().includes('complexity') || answer.toLowerCase().includes('efficient')) baseScore += 1;
      if (wordCount < 30) baseScore -= 1; // Coding needs explanation
      break;
  }
  
  // Quality indicators
  if (hasExamples && questionType !== 'coding') baseScore += 0.5;
  if (hasNumbers) baseScore += 0.3;
  
  // Grammar and structure (basic check)
  const sentences = answer.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length > 1) baseScore += 0.2; // Multiple sentences show structure
  
  return Math.max(1, Math.min(10, Math.round(baseScore * 10) / 10));
}

function generateFallbackFeedback(answer: string, questionType: string): string {
  if (!answer || answer.trim() === "" || answer.trim() === "No answer provided") {
    return "No answer was provided for this question. Consider taking time to think through your response and provide specific examples or explanations that demonstrate your knowledge and experience.";
  }
  
  const wordCount = answer.trim().split(/\s+/).length;
  const hasExamples = answer.toLowerCase().includes('example') || answer.toLowerCase().includes('instance') || answer.toLowerCase().includes('time when');
  const hasNumbers = /\d/.test(answer);
  const hasSpecificTerms = answer.length > 50; // Basic complexity check
  
  let feedback = "";
  
  // Question type specific feedback
  switch (questionType) {
    case 'technical':
      if (wordCount < 20) {
        feedback = "Your technical answer needs more depth. Consider explaining the concept step-by-step, mentioning specific technologies or methodologies you've used, and providing concrete examples from your experience.";
      } else if (wordCount < 50) {
        feedback = "Good start on the technical explanation. To strengthen your answer, add more specific details about implementation, challenges you've faced, and how you solved them. Mention relevant tools or frameworks.";
      } else {
        feedback = "Solid technical response with good detail. " + (hasSpecificTerms ? "Your answer shows good technical depth. " : "Consider adding more specific technical terms and methodologies. ") + "For even stronger answers, include metrics or outcomes when possible.";
      }
      break;
      
    case 'behavioral':
      if (wordCount < 20) {
        feedback = "Behavioral questions require specific examples. Use the STAR method (Situation, Task, Action, Result) to structure your response. Describe a real situation, what you did, and what the outcome was.";
      } else if (wordCount < 50) {
        feedback = "Your answer has a good foundation. To improve, provide more context about the situation, explain your specific actions and decision-making process, and quantify the results when possible.";
      } else {
        feedback = "Well-structured behavioral response. " + (hasExamples ? "Good use of specific examples. " : "Consider adding more concrete examples. ") + "Strong answers also include lessons learned and how you'd apply this experience in future situations.";
      }
      break;
      
    case 'situational':
      if (wordCount < 20) {
        feedback = "Situational questions need detailed problem-solving approaches. Explain how you would assess the situation, what steps you'd take, who you'd involve, and how you'd measure success.";
      } else if (wordCount < 50) {
        feedback = "Good approach to the scenario. Enhance your answer by explaining your reasoning, discussing potential challenges, and describing how you'd adapt if your initial approach didn't work.";
      } else {
        feedback = "Comprehensive situational response. " + (hasSpecificTerms ? "You've shown good analytical thinking. " : "Consider adding more strategic thinking elements. ") + "Excellent situational answers also address risk management and stakeholder communication.";
      }
      break;
      
    case 'coding':
      if (wordCount < 20) {
        feedback = "Coding questions require clear problem-solving logic. Explain your approach, walk through your solution step-by-step, mention time/space complexity, and discuss alternative approaches or optimizations.";
      } else if (wordCount < 50) {
        feedback = "Good start on the coding solution. Strengthen your answer by explaining edge cases, discussing algorithm efficiency, and mentioning how you would test your solution.";
      } else {
        feedback = "Detailed coding response. " + (hasNumbers ? "Good attention to complexity analysis. " : "Consider discussing time/space complexity. ") + "Strong coding answers also cover error handling and potential optimizations.";
      }
      break;
      
    default:
      if (wordCount < 20) {
        feedback = "Your answer needs more elaboration. Provide specific examples, explain your reasoning, and connect your response to relevant experience or knowledge.";
      } else {
        feedback = "Solid response with good detail. Consider adding more specific examples and quantifiable results to make your answer even more compelling.";
      }
  }
  
  // Add specific improvement suggestions
  if (!hasExamples && questionType !== 'technical' && questionType !== 'coding') {
    feedback += " Remember to include specific examples from your experience to make your answers more credible and memorable.";
  }
  
  if (!hasNumbers && (questionType === 'technical' || questionType === 'behavioral')) {
    feedback += " When possible, include metrics, percentages, or timeframes to quantify your impact and achievements.";
  }
  
  return feedback;
}

export const generateInterviewFeedback = internalAction({
  args: { interviewId: v.id("interviews") },
  handler: async (ctx, args) => {
    const responses = await ctx.runQuery(internal.aiQueries.getInterviewResponses, {
      interviewId: args.interviewId,
    });

    if (!responses.length) {
      console.error("No responses found for interview:", args.interviewId);
      return;
    }

    const validScores = responses.filter((r: any) => r.score && r.score > 0);
    const averageScore = validScores.length > 0 
      ? validScores.reduce((sum: number, r: any) => sum + r.score, 0) / validScores.length
      : 5; // Default to 5 if no scores available

    // Check if OpenAI is configured
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      console.error("OpenAI API key not configured, using fallback feedback");
      const fallbackFeedback = generateFallbackInterviewFeedback(responses, averageScore);
      await ctx.runMutation(internal.interviews.updateInterviewScore, {
        interviewId: args.interviewId,
        score: Math.round(averageScore * 10) / 10,
        feedback: fallbackFeedback,
      });
      return;
    }

    const prompt = `Generate overall interview feedback based on these responses:

${responses.map((r: any, i: number) => `
Question ${i + 1}: ${r.questionText}
Answer: ${r.answer}
Score: ${r.score}/10
Individual Feedback: ${r.feedback}
`).join('\n')}

Average Score: ${averageScore.toFixed(1)}/10

Please structure your feedback in the following format with clear section headers:

Overall Performance Summary:
[Provide a 2-3 sentence summary of overall performance and score interpretation]

Key Strengths:
• [List 3-4 specific strengths demonstrated]
• [Include specific examples from their answers]
• [Highlight positive communication and technical skills]

Areas for Improvement:
• [List 3-4 specific areas that need work]
• [Be constructive and specific]
• [Focus on actionable improvements]

Recommendations for Future Interviews:
• [Provide 4-5 specific, actionable recommendations]
• [Include study suggestions and practice areas]
• [Mention interview preparation strategies]

Keep it professional, constructive, and actionable. Use bullet points for lists and clear section headers.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
      });

      const feedback = response.choices[0].message.content;
      if (!feedback) {
        throw new Error("No feedback received from OpenAI");
      }

      await ctx.runMutation(internal.interviews.updateInterviewScore, {
        interviewId: args.interviewId,
        score: Math.round(averageScore * 10) / 10,
        feedback,
      });

      console.log(`Successfully generated feedback for interview ${args.interviewId}`);
    } catch (error) {
      console.error("Error generating feedback:", error);
      
      // Fallback feedback when AI generation fails
      const fallbackFeedback = generateFallbackInterviewFeedback(responses, averageScore);
      await ctx.runMutation(internal.interviews.updateInterviewScore, {
        interviewId: args.interviewId,
        score: Math.round(averageScore * 10) / 10,
        feedback: fallbackFeedback,
      });
    }
  },
});

function generateFallbackInterviewFeedback(responses: any[], averageScore: number): string {
  const totalQuestions = responses.length;
  const answeredQuestions = responses.filter(r => r.answer && r.answer.trim() !== "" && r.answer.trim() !== "No answer provided").length;
  
  let feedback = `Overall Performance Summary:\n`;
  
  // Overall performance section
  if (averageScore >= 8) {
    feedback += `Outstanding Performance: You demonstrated excellent knowledge and communication skills throughout the interview with an overall score of ${averageScore.toFixed(1)}/10. Your responses showed depth, clarity, and strong professional experience.\n\n`;
  } else if (averageScore >= 6) {
    feedback += `Good Performance: You showed solid understanding and provided thoughtful responses with an overall score of ${averageScore.toFixed(1)}/10. Your answers demonstrate competence and good communication skills.\n\n`;
  } else if (averageScore >= 4) {
    feedback += `Developing Performance: You have a foundation to build upon with an overall score of ${averageScore.toFixed(1)}/10. There are clear opportunities to strengthen your interview responses.\n\n`;
  } else {
    feedback += `Areas for Growth: There are significant opportunities to strengthen your interview skills with an overall score of ${averageScore.toFixed(1)}/10. Focus on preparation and practice will help improve your performance.\n\n`;
  }
  
  // Key Strengths section
  feedback += `Key Strengths:\n`;
  if (answeredQuestions === totalQuestions) {
    feedback += `• Excellent completion rate - you addressed all ${totalQuestions} questions\n`;
  } else {
    feedback += `• Attempted ${answeredQuestions} out of ${totalQuestions} questions\n`;
  }
  
  if (averageScore >= 7) {
    feedback += `• Strong communication and articulation skills\n`;
    feedback += `• Good depth in your responses\n`;
  } else if (averageScore >= 5) {
    feedback += `• Clear effort to provide detailed responses\n`;
    feedback += `• Basic understanding of interview expectations\n`;
  }
  
  const longAnswers = responses.filter(r => r.answer && r.answer.split(' ').length > 50).length;
  if (longAnswers > 0) {
    feedback += `• Provided comprehensive answers for ${longAnswers} questions\n`;
  }
  
  feedback += `\nAreas for Improvement:\n`;
  
  if (answeredQuestions < totalQuestions) {
    feedback += `• Complete all questions - ${totalQuestions - answeredQuestions} questions were left unanswered\n`;
  }
  
  if (averageScore < 6) {
    feedback += `• Provide more specific examples and details in your responses\n`;
    feedback += `• Practice articulating your thoughts more clearly\n`;
  }
  
  const shortAnswers = responses.filter(r => r.answer && r.answer.split(' ').length < 20).length;
  if (shortAnswers > totalQuestions / 2) {
    feedback += `• Expand your answers with more detail and examples\n`;
  }
  
  feedback += `\nRecommendations for Future Interviews:\n`;
  feedback += `• Prepare specific examples from your experience using the STAR method\n`;
  feedback += `• Practice common interview questions for your field\n`;
  feedback += `• Research the company and role thoroughly before interviews\n`;
  
  if (averageScore < 7) {
    feedback += `• Work on structuring your answers more clearly\n`;
    feedback += `• Practice explaining complex concepts in simple terms\n`;
  }
  
  feedback += `• Continue practicing mock interviews to build confidence\n`;
  feedback += `\nRemember: Interview skills improve with practice. Keep working on your responses and you'll see continued improvement. Good luck with your job search!`;
  
  return feedback;
}

export const checkConfiguration = internalAction({
  args: {},
  handler: async (ctx, args) => {
    const hasOpenAIKey = !!process.env.CONVEX_OPENAI_API_KEY;
    const hasOpenAIBaseURL = !!process.env.CONVEX_OPENAI_BASE_URL;
    
    console.log("Configuration check:");
    console.log("- OpenAI API Key:", hasOpenAIKey ? "✓ Configured" : "✗ Missing");
    console.log("- OpenAI Base URL:", hasOpenAIBaseURL ? "✓ Configured" : "✗ Missing (will use default)");
    
    if (!hasOpenAIKey) {
      console.log("⚠️  Warning: Without OpenAI configuration, fallback scoring will be used");
    }
    
    return {
      hasOpenAIKey,
      hasOpenAIBaseURL,
      isFullyConfigured: hasOpenAIKey,
    };
  },
});
