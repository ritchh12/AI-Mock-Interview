import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface InterviewSessionProps {
  interviewId: Id<"interviews">;
  onComplete: () => void;
  onBack: () => void;
}

export function InterviewSession({ interviewId, onComplete, onBack }: InterviewSessionProps) {
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);

  const interview = useQuery(api.interviews.getInterview, { interviewId });
  const currentQuestionData = useQuery(api.interviews.getCurrentQuestion, { interviewId });
  const startInterview = useMutation(api.interviews.startInterview);
  const submitAnswer = useMutation(api.interviews.submitAnswer);

  const currentQuestion = currentQuestionData?.question;
  const progress = currentQuestionData?.progress || 0;

  // Start interview if it's pending
  useEffect(() => {
    if (interview?.status === "pending") {
      startInterview({ interviewId }).catch(console.error);
    }
  }, [interview?.status, startInterview, interviewId]);

  // Initialize timer when question loads
  useEffect(() => {
    if (currentQuestion?.timeLimit && !startTime) {
      setTimeLeft(currentQuestion.timeLimit);
      setStartTime(Date.now());
    }
  }, [currentQuestion?.timeLimit, startTime]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleSubmit = async () => {
    if (!currentQuestion || isSubmitting) return;

    setIsSubmitting(true);
    
    try {
      const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
      
      const result = await submitAnswer({
        interviewId,
        questionId: currentQuestion._id,
        answer: answer.trim() || "No answer provided",
        timeSpent,
      });

      if (result.isCompleted) {
        toast.success("Interview completed! Generating your results...");
        onComplete();
      } else {
        // Reset for next question
        setAnswer("");
        setTimeLeft(null);
        setStartTime(null);
        toast.success("Answer submitted! Moving to next question...");
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      toast.error("Failed to submit answer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getQuestionTypeColor = (type: string) => {
    switch (type) {
      case "technical":
        return "bg-blue-100 text-blue-800";
      case "behavioral":
        return "bg-green-100 text-green-800";
      case "situational":
        return "bg-purple-100 text-purple-800";
      case "coding":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!interview || !currentQuestionData) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Preparing your interview...</h2>
        <p className="text-gray-600">Questions are being generated. This may take a moment.</p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mt-4"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{interview.title}</h1>
            <p className="text-gray-600">{interview.jobRole}</p>
          </div>
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Exit Interview
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Question {currentQuestionData.currentIndex + 1} of {currentQuestionData.totalQuestions}
            </span>
            {timeLeft !== null && (
              <span className={`text-sm font-medium ${timeLeft <= 30 ? "text-red-600" : "text-gray-700"}`}>
                Time: {formatTime(timeLeft)}
              </span>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Question */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getQuestionTypeColor(currentQuestion.questionType)}`}>
              {currentQuestion.questionType.charAt(0).toUpperCase() + currentQuestion.questionType.slice(1)}
            </span>
            {currentQuestion.timeLimit && (
              <span className="text-sm text-gray-500">
                {Math.floor(currentQuestion.timeLimit / 60)} min limit
              </span>
            )}
          </div>
          
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {currentQuestion.questionText}
          </h2>
          
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer here..."
            className="w-full h-48 px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow resize-none"
            disabled={isSubmitting}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {answer.length > 0 && (
              <span>{answer.length} characters</span>
            )}
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !answer.trim()}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : "Submit Answer"}
            </button>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-2">💡 Tips for this question type:</h3>
          <p className="text-sm text-blue-700">
            {currentQuestion.questionType === "behavioral" && "Use the STAR method: Situation, Task, Action, Result"}
            {currentQuestion.questionType === "technical" && "Explain your thought process and consider edge cases"}
            {currentQuestion.questionType === "situational" && "Describe specific steps you would take and why"}
            {currentQuestion.questionType === "coding" && "Think out loud and explain your approach before coding"}
          </p>
        </div>
      </div>
    </div>
  );
}
