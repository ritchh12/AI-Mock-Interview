import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const createInterview = mutation({
  args: {
    title: v.string(),
    jobRole: v.string(),
    company: v.optional(v.string()),
    difficulty: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
    totalQuestions: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to create an interview");
    }

    const interviewId = await ctx.db.insert("interviews", {
      userId,
      title: args.title,
      jobRole: args.jobRole,
      company: args.company,
      difficulty: args.difficulty,
      status: "pending",
      totalQuestions: args.totalQuestions,
      currentQuestionIndex: 0,
    });

    // Schedule AI to generate questions
    await ctx.scheduler.runAfter(0, internal.ai.generateInterviewQuestions, {
      interviewId,
      jobRole: args.jobRole,
      difficulty: args.difficulty,
      totalQuestions: args.totalQuestions,
    });

    return interviewId;
  },
});

export const getUserInterviews = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    return await ctx.db
      .query("interviews")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getInterview = query({
  args: { interviewId: v.id("interviews") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const interview = await ctx.db.get(args.interviewId);
    if (!interview || interview.userId !== userId) {
      throw new Error("Interview not found or access denied");
    }

    return interview;
  },
});

export const getInterviewQuestions = query({
  args: { interviewId: v.id("interviews") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const interview = await ctx.db.get(args.interviewId);
    if (!interview || interview.userId !== userId) {
      throw new Error("Interview not found or access denied");
    }

    return await ctx.db
      .query("questions")
      .withIndex("by_interview", (q) => q.eq("interviewId", args.interviewId))
      .order("asc")
      .collect();
  },
});

export const startInterview = mutation({
  args: { interviewId: v.id("interviews") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const interview = await ctx.db.get(args.interviewId);
    if (!interview || interview.userId !== userId) {
      throw new Error("Interview not found or access denied");
    }

    if (interview.status !== "pending") {
      throw new Error("Interview already started or completed");
    }

    await ctx.db.patch(args.interviewId, {
      status: "in_progress",
      startedAt: Date.now(),
    });

    return interview;
  },
});

export const submitAnswer = mutation({
  args: {
    interviewId: v.id("interviews"),
    questionId: v.id("questions"),
    answer: v.string(),
    timeSpent: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const interview = await ctx.db.get(args.interviewId);
    if (!interview || interview.userId !== userId) {
      throw new Error("Interview not found or access denied");
    }

    // Save the response
    const responseId = await ctx.db.insert("responses", {
      interviewId: args.interviewId,
      questionId: args.questionId,
      userId,
      answer: args.answer,
      timeSpent: args.timeSpent,
      submittedAt: Date.now(),
    });

    // Move to next question
    const nextQuestionIndex = interview.currentQuestionIndex + 1;
    const isCompleted = nextQuestionIndex >= interview.totalQuestions;

    await ctx.db.patch(args.interviewId, {
      currentQuestionIndex: nextQuestionIndex,
      status: isCompleted ? "completed" : "in_progress",
      completedAt: isCompleted ? Date.now() : undefined,
    });

    // If completed, schedule AI feedback generation
    if (isCompleted) {
      // Also evaluate the last answer before generating overall feedback
      await ctx.scheduler.runAfter(0, internal.ai.evaluateAnswer, {
        responseId,
        questionId: args.questionId,
        answer: args.answer,
      });
      
      await ctx.scheduler.runAfter(3000, internal.ai.generateInterviewFeedback, {
        interviewId: args.interviewId,
      });
    } else {
      // Schedule AI to evaluate the current answer
      await ctx.scheduler.runAfter(0, internal.ai.evaluateAnswer, {
        responseId,
        questionId: args.questionId,
        answer: args.answer,
      });
    }

    return { isCompleted, nextQuestionIndex };
  },
});

export const getCurrentQuestion = query({
  args: { interviewId: v.id("interviews") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const interview = await ctx.db.get(args.interviewId);
    if (!interview || interview.userId !== userId) {
      throw new Error("Interview not found or access denied");
    }

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_interview", (q) => q.eq("interviewId", args.interviewId))
      .order("asc")
      .collect();

    const currentQuestion = questions[interview.currentQuestionIndex];
    
    return {
      question: currentQuestion,
      currentIndex: interview.currentQuestionIndex,
      totalQuestions: interview.totalQuestions,
      progress: (interview.currentQuestionIndex / interview.totalQuestions) * 100,
    };
  },
});

export const getInterviewResults = query({
  args: { interviewId: v.id("interviews") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const interview = await ctx.db.get(args.interviewId);
    if (!interview || interview.userId !== userId) {
      throw new Error("Interview not found or access denied");
    }

    if (interview.status !== "completed") {
      throw new Error("Interview not completed yet");
    }

    const responses = await ctx.db
      .query("responses")
      .withIndex("by_interview", (q) => q.eq("interviewId", args.interviewId))
      .collect();

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_interview", (q) => q.eq("interviewId", args.interviewId))
      .order("asc")
      .collect();

    const results = questions.map((question) => {
      const response = responses.find((r) => r.questionId === question._id);
      return {
        question: question.questionText,
        answer: response?.answer || "",
        score: response?.score,
        feedback: response?.feedback,
        timeSpent: response?.timeSpent || 0,
        questionType: question.questionType,
      };
    });

    return {
      interview,
      results,
      overallScore: interview.score,
      overallFeedback: interview.feedback,
    };
  },
});

export const updateInterviewScore = internalMutation({
  args: {
    interviewId: v.id("interviews"),
    score: v.number(),
    feedback: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.interviewId, {
      score: args.score,
      feedback: args.feedback,
    });
  },
});

export const retryInterviewEvaluation = mutation({
  args: { interviewId: v.id("interviews") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const interview = await ctx.db.get(args.interviewId);
    if (!interview || interview.userId !== userId) {
      throw new Error("Interview not found or access denied");
    }

    if (interview.status !== "completed") {
      throw new Error("Interview must be completed to retry evaluation");
    }

    // Get all responses for this interview
    const responses = await ctx.db
      .query("responses")
      .withIndex("by_interview", (q) => q.eq("interviewId", args.interviewId))
      .collect();

    // Retry evaluation for responses without scores
    for (const response of responses) {
      if (!response.score) {
        await ctx.scheduler.runAfter(0, internal.ai.evaluateAnswer, {
          responseId: response._id,
          questionId: response.questionId,
          answer: response.answer,
        });
      }
    }

    // Retry overall feedback generation
    await ctx.scheduler.runAfter(5000, internal.ai.generateInterviewFeedback, {
      interviewId: args.interviewId,
    });

    return { success: true };
  },
});
