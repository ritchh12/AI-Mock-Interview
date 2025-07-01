import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";

export const getQuestion = internalQuery({
  args: { questionId: v.id("questions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.questionId);
  },
});

export const updateResponseScore = internalMutation({
  args: {
    responseId: v.id("responses"),
    score: v.number(),
    feedback: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.responseId, {
      score: args.score,
      feedback: args.feedback,
    });
  },
});

export const getInterviewResponses = internalQuery({
  args: { interviewId: v.id("interviews") },
  handler: async (ctx, args) => {
    const responses = await ctx.db
      .query("responses")
      .withIndex("by_interview", (q) => q.eq("interviewId", args.interviewId))
      .collect();

    const results = [];
    for (const response of responses) {
      const question = await ctx.db.get(response.questionId);
      if (question) {
        results.push({
          ...response,
          questionText: question.questionText,
        });
      }
    }

    return results;
  },
});
