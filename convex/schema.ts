import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  interviews: defineTable({
    userId: v.id("users"),
    title: v.string(),
    jobRole: v.string(),
    company: v.optional(v.string()),
    difficulty: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
    status: v.union(v.literal("pending"), v.literal("in_progress"), v.literal("completed")),
    totalQuestions: v.number(),
    currentQuestionIndex: v.number(),
    score: v.optional(v.number()),
    feedback: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  questions: defineTable({
    interviewId: v.id("interviews"),
    questionText: v.string(),
    questionType: v.union(
      v.literal("technical"), 
      v.literal("behavioral"), 
      v.literal("situational"),
      v.literal("coding")
    ),
    difficulty: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
    order: v.number(),
    expectedAnswer: v.optional(v.string()),
    timeLimit: v.optional(v.number()), // in seconds
  }).index("by_interview", ["interviewId", "order"]),

  responses: defineTable({
    interviewId: v.id("interviews"),
    questionId: v.id("questions"),
    userId: v.id("users"),
    answer: v.string(),
    timeSpent: v.number(), // in seconds
    score: v.optional(v.number()), // 1-10 scale
    feedback: v.optional(v.string()),
    submittedAt: v.number(),
  }).index("by_interview", ["interviewId"]).index("by_question", ["questionId"]),

  interviewTemplates: defineTable({
    name: v.string(),
    jobRole: v.string(),
    difficulty: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
    questionTypes: v.array(v.union(
      v.literal("technical"), 
      v.literal("behavioral"), 
      v.literal("situational"),
      v.literal("coding")
    )),
    totalQuestions: v.number(),
    description: v.string(),
    isActive: v.boolean(),
  }).index("by_role", ["jobRole"]).index("by_active", ["isActive"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
