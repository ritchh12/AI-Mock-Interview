import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const saveQuestion = internalMutation({
  args: {
    interviewId: v.id("interviews"),
    questionText: v.string(),
    questionType: v.union(v.literal("technical"), v.literal("behavioral"), v.literal("situational"), v.literal("coding")),
    difficulty: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
    order: v.number(),
    expectedAnswer: v.optional(v.string()),
    timeLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("questions", args);
  },
});

export const createDefaultQuestions = internalMutation({
  args: {
    interviewId: v.id("interviews"),
    jobRole: v.string(),
    difficulty: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
    totalQuestions: v.number(),
  },
  handler: async (ctx, args) => {
    const defaultQuestions = [
      {
        questionText: "Tell me about yourself and your background.",
        questionType: "behavioral" as const,
        timeLimit: 120,
        expectedAnswer: "Professional background, relevant experience, career goals",
      },
      {
        questionText: "What interests you about this role?",
        questionType: "behavioral" as const,
        timeLimit: 90,
        expectedAnswer: "Specific aspects of the role, company alignment, growth opportunities",
      },
      {
        questionText: "Describe a challenging project you worked on recently.",
        questionType: "situational" as const,
        timeLimit: 180,
        expectedAnswer: "Project details, challenges faced, solutions implemented, outcomes",
      },
      {
        questionText: "What are your greatest strengths and weaknesses?",
        questionType: "behavioral" as const,
        timeLimit: 120,
        expectedAnswer: "Honest self-assessment with examples and improvement plans",
      },
      {
        questionText: "How do you handle working under pressure?",
        questionType: "situational" as const,
        timeLimit: 90,
        expectedAnswer: "Specific strategies, examples, stress management techniques",
      },
    ];

    for (let i = 0; i < Math.min(args.totalQuestions, defaultQuestions.length); i++) {
      const question = defaultQuestions[i];
      await ctx.db.insert("questions", {
        interviewId: args.interviewId,
        questionText: question.questionText,
        questionType: question.questionType,
        difficulty: args.difficulty,
        order: i,
        expectedAnswer: question.expectedAnswer,
        timeLimit: question.timeLimit,
      });
    }
  },
});

export const createEnhancedDefaultQuestions = internalMutation({
  args: {
    interviewId: v.id("interviews"),
    jobRole: v.string(),
    difficulty: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
    totalQuestions: v.number(),
  },
  handler: async (ctx, args) => {
    const questionPools = {
      behavioral: [
        "Tell me about yourself and your background.",
        "What interests you about this role?",
        "What are your greatest strengths and weaknesses?",
        "Describe a time when you had to work with a difficult team member.",
        "Tell me about a time you made a mistake and how you handled it.",
        "What motivates you in your work?",
        "How do you handle criticism or feedback?",
        "Describe your ideal work environment.",
        "Where do you see yourself in 5 years?",
        "Why are you leaving your current position?",
        "What accomplishment are you most proud of?",
        "How do you prioritize your work when you have multiple deadlines?",
      ],
      situational: [
        "Describe a challenging project you worked on recently.",
        "How do you handle working under pressure?",
        "Tell me about a time you had to learn something new quickly.",
        "Describe a situation where you had to work with limited resources.",
        "How would you handle a conflict with a colleague?",
        "Tell me about a time you had to make a difficult decision.",
        "Describe a situation where you had to adapt to change.",
        "How do you handle multiple competing priorities?",
        "Tell me about a time you had to persuade someone to see your point of view.",
        "Describe a situation where you exceeded expectations.",
        "How would you approach a project with unclear requirements?",
        "Tell me about a time you had to work with someone from a different background.",
      ],
      technical: {
        software: [
          "Explain the difference between synchronous and asynchronous programming.",
          "What is the difference between SQL and NoSQL databases?",
          "How do you ensure code quality in your projects?",
          "Explain the concept of version control and its importance.",
          "What are the key principles of object-oriented programming?",
          "How do you approach debugging complex issues?",
          "What is the importance of testing in software development?",
          "Explain the concept of API design and best practices.",
          "How do you handle security considerations in your applications?",
          "What are the benefits of using design patterns?",
        ],
        marketing: [
          "How do you measure the success of a marketing campaign?",
          "Explain the difference between B2B and B2C marketing strategies.",
          "What role does data analytics play in modern marketing?",
          "How do you approach customer segmentation?",
          "What are the key components of a successful content strategy?",
          "How do you stay current with marketing trends and tools?",
          "Explain the customer journey and how to optimize it.",
          "What metrics do you consider most important for digital marketing?",
          "How do you approach A/B testing for marketing campaigns?",
          "What is the role of social media in modern marketing?",
        ],
        sales: [
          "How do you approach qualifying leads?",
          "Describe your sales process from prospect to close.",
          "How do you handle objections from potential customers?",
          "What tools do you use to track and manage your sales pipeline?",
          "How do you build rapport with new prospects?",
          "What strategies do you use to overcome price objections?",
          "How do you stay motivated during slow periods?",
          "Describe your approach to following up with prospects.",
          "How do you identify customer pain points?",
          "What role does social selling play in your strategy?",
        ],
        general: [
          "How do you stay updated with industry trends?",
          "What tools and technologies are you familiar with?",
          "How do you approach problem-solving in your field?",
          "What professional development have you pursued recently?",
          "How do you measure success in your role?",
          "What industry challenges are you most interested in solving?",
          "How do you collaborate with other departments?",
          "What best practices do you follow in your work?",
          "How do you ensure quality in your deliverables?",
          "What emerging trends excite you most about your field?",
        ],
      },
      coding: [
        "Write a function to reverse a string without using built-in methods.",
        "How would you find the largest element in an array?",
        "Explain how you would implement a simple caching mechanism.",
        "Write pseudocode for a function that checks if a string is a palindrome.",
        "How would you approach sorting an array of objects by a specific property?",
        "Describe how you would implement a basic search functionality.",
        "Write a function to remove duplicates from an array.",
        "How would you validate user input in a form?",
        "Explain how you would implement pagination for a large dataset.",
        "Describe your approach to handling errors in your code.",
      ],
    };

    // Determine technical questions based on job role
    let technicalQuestions = questionPools.technical.general;
    const jobRoleLower = args.jobRole.toLowerCase();
    
    if (jobRoleLower.includes('developer') || jobRoleLower.includes('engineer') || jobRoleLower.includes('programmer')) {
      technicalQuestions = questionPools.technical.software;
    } else if (jobRoleLower.includes('marketing') || jobRoleLower.includes('digital')) {
      technicalQuestions = questionPools.technical.marketing;
    } else if (jobRoleLower.includes('sales') || jobRoleLower.includes('account')) {
      technicalQuestions = questionPools.technical.sales;
    }

    // Mix of question types based on the requested distribution
    const questionMix = [];
    const targetCounts = {
      technical: Math.ceil(args.totalQuestions * 0.4),
      behavioral: Math.ceil(args.totalQuestions * 0.3),
      situational: Math.ceil(args.totalQuestions * 0.2),
      coding: Math.max(1, Math.floor(args.totalQuestions * 0.1)),
    };

    // Adjust counts to match total questions
    let totalCount = Object.values(targetCounts).reduce((sum, count) => sum + count, 0);
    if (totalCount > args.totalQuestions) {
      targetCounts.coding = Math.max(0, targetCounts.coding - (totalCount - args.totalQuestions));
    }

    // Add technical questions
    const shuffledTechnical = [...technicalQuestions].sort(() => 0.5 - Math.random());
    for (let i = 0; i < Math.min(targetCounts.technical, shuffledTechnical.length); i++) {
      questionMix.push({
        questionText: shuffledTechnical[i],
        questionType: "technical" as const,
        timeLimit: args.difficulty === "beginner" ? 120 : args.difficulty === "intermediate" ? 150 : 180,
        expectedAnswer: "Demonstrate technical knowledge and problem-solving approach",
      });
    }

    // Add behavioral questions
    const shuffledBehavioral = [...questionPools.behavioral].sort(() => 0.5 - Math.random());
    for (let i = 0; i < Math.min(targetCounts.behavioral, shuffledBehavioral.length); i++) {
      questionMix.push({
        questionText: shuffledBehavioral[i],
        questionType: "behavioral" as const,
        timeLimit: args.difficulty === "beginner" ? 90 : args.difficulty === "intermediate" ? 120 : 150,
        expectedAnswer: "Provide specific examples and demonstrate soft skills",
      });
    }

    // Add situational questions
    const shuffledSituational = [...questionPools.situational].sort(() => 0.5 - Math.random());
    for (let i = 0; i < Math.min(targetCounts.situational, shuffledSituational.length); i++) {
      questionMix.push({
        questionText: shuffledSituational[i],
        questionType: "situational" as const,
        timeLimit: args.difficulty === "beginner" ? 120 : args.difficulty === "intermediate" ? 180 : 240,
        expectedAnswer: "Use STAR method (Situation, Task, Action, Result)",
      });
    }

    // Add coding questions if needed
    if (targetCounts.coding > 0) {
      const shuffledCoding = [...questionPools.coding].sort(() => 0.5 - Math.random());
      for (let i = 0; i < Math.min(targetCounts.coding, shuffledCoding.length); i++) {
        questionMix.push({
          questionText: shuffledCoding[i],
          questionType: "coding" as const,
          timeLimit: args.difficulty === "beginner" ? 180 : args.difficulty === "intermediate" ? 240 : 300,
          expectedAnswer: "Write clean, working code with good logic",
        });
      }
    }

    // Shuffle the final question mix and trim to requested count
    const finalQuestions = questionMix.sort(() => 0.5 - Math.random()).slice(0, args.totalQuestions);

    // Save questions to database
    for (let i = 0; i < finalQuestions.length; i++) {
      const question = finalQuestions[i];
      await ctx.db.insert("questions", {
        interviewId: args.interviewId,
        questionText: question.questionText,
        questionType: question.questionType,
        difficulty: args.difficulty,
        order: i,
        expectedAnswer: question.expectedAnswer,
        timeLimit: question.timeLimit,
      });
    }

    console.log(`Generated ${finalQuestions.length} enhanced default questions for ${args.jobRole} (${args.difficulty} level)`);
  },
});
