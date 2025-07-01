import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { toast } from "sonner";

interface InterviewResultsProps {
  interviewId: Id<"interviews">;
  onBack: () => void;
}

interface FeedbackSection {
  title: string;
  icon: string;
  content: string;
  type: 'success' | 'warning' | 'info' | 'improvement';
}

export function InterviewResults({ interviewId, onBack }: InterviewResultsProps) {
  const results = useQuery(api.interviews.getInterviewResults, { interviewId });
  const retryEvaluation = useMutation(api.interviews.retryInterviewEvaluation);
  const [isRetrying, setIsRetrying] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

  const parseFeedbackIntoSections = (feedback: string): FeedbackSection[] => {
    if (!feedback) return [];

    // Try to parse structured feedback
    const sections: FeedbackSection[] = [];
    
    // Split by common patterns and create sections
    const lines = feedback.split('\n').filter(line => line.trim());
    
    let currentSection: FeedbackSection | null = null;
    let contentBuffer: string[] = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check for section headers
      if (trimmedLine.includes('Overall Performance') || trimmedLine.includes('Performance Summary')) {
        if (currentSection) {
          currentSection.content = contentBuffer.join('\n');
          sections.push(currentSection);
        }
        currentSection = {
          title: 'Overall Performance',
          icon: '📊',
          content: '',
          type: 'info'
        };
        contentBuffer = [trimmedLine];
      } else if (trimmedLine.includes('Strengths') || trimmedLine.includes('Key Areas:')) {
        if (currentSection) {
          currentSection.content = contentBuffer.join('\n');
          sections.push(currentSection);
        }
        currentSection = {
          title: 'Key Strengths',
          icon: '💪',
          content: '',
          type: 'success'
        };
        contentBuffer = [trimmedLine];
      } else if (trimmedLine.includes('Areas for improvement') || trimmedLine.includes('Recommendations')) {
        if (currentSection) {
          currentSection.content = contentBuffer.join('\n');
          sections.push(currentSection);
        }
        currentSection = {
          title: 'Areas for Improvement',
          icon: '🎯',
          content: '',
          type: 'improvement'
        };
        contentBuffer = [trimmedLine];
      } else if (trimmedLine.includes('Recommendations') || trimmedLine.includes('Future Interviews')) {
        if (currentSection) {
          currentSection.content = contentBuffer.join('\n');
          sections.push(currentSection);
        }
        currentSection = {
          title: 'Recommendations',
          icon: '💡',
          content: '',
          type: 'warning'
        };
        contentBuffer = [trimmedLine];
      } else {
        contentBuffer.push(trimmedLine);
      }
    }
    
    // Add the last section
    if (currentSection) {
      currentSection.content = contentBuffer.join('\n');
      sections.push(currentSection);
    }
    
    // If no structured sections found, create a default one
    if (sections.length === 0) {
      sections.push({
        title: 'Interview Feedback',
        icon: '📝',
        content: feedback,
        type: 'info'
      });
    }
    
    return sections;
  };

  if (!results) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Generating your results...</p>
        </div>
      </div>
    );
  }

  const { interview, results: questionResults, overallScore, overallFeedback } = results;

  const getSectionStyle = (type: FeedbackSection['type']) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'improvement':
        return 'border-orange-200 bg-orange-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const getTextStyle = (type: FeedbackSection['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'warning':
        return 'text-yellow-800';
      case 'improvement':
        return 'text-orange-800';
      default:
        return 'text-blue-800';
    }
  };

  const handleRetryEvaluation = async () => {
    setIsRetrying(true);
    try {
      await retryEvaluation({ interviewId });
      // Results will automatically update via the query
      toast.success("Evaluation retry initiated. Please wait a few moments for updated scores.");
    } catch (error) {
      console.error("Error retrying evaluation:", error);
      toast.error("Failed to retry evaluation. Please try again later.");
    } finally {
      setIsRetrying(false);
    }
  };

  // Check if any scores are missing
  const hasMissingScores = !overallScore || questionResults.some(r => !r.score);

  const getScoreColor = (score: number | undefined) => {
    if (!score) return "text-gray-500";
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    return "text-red-600";
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Interview Results</h1>
            <h2 className="text-xl text-gray-600">{interview.title}</h2>
            <p className="text-gray-500">{interview.jobRole}</p>
          </div>
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Overall Score */}
        <div className="text-center py-8 border-t border-b border-gray-200">
          <div className="text-6xl font-bold mb-2">
            <span className={getScoreColor(overallScore)}>
              {overallScore ? overallScore.toFixed(1) : "N/A"}
            </span>
            <span className="text-gray-400">/10</span>
          </div>
          <p className="text-xl text-gray-600">Overall Score</p>
          
          {hasMissingScores && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">
                Scores are still being calculated or need to be regenerated
              </p>
              <button
                onClick={handleRetryEvaluation}
                disabled={isRetrying}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {isRetrying ? "Regenerating..." : "Regenerate Scores"}
              </button>
            </div>
          )}
        </div>

        {/* Overall Feedback */}
        {overallFeedback ? (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Overall Feedback</h3>
              <button
                onClick={() => {
                  const sections = parseFeedbackIntoSections(overallFeedback);
                  const allExpanded = sections.every((_, index) => expandedSections.has(index));
                  if (allExpanded) {
                    setExpandedSections(new Set());
                  } else {
                    setExpandedSections(new Set(sections.map((_, index) => index)));
                  }
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                {parseFeedbackIntoSections(overallFeedback).every((_, index) => expandedSections.has(index)) 
                  ? "Collapse All" 
                  : "Expand All"
                }
              </button>
            </div>
            <div className="space-y-3">
              {parseFeedbackIntoSections(overallFeedback).map((section, index) => (
                <div 
                  key={index}
                  className={`rounded-lg border-2 ${getSectionStyle(section.type)} transition-all duration-200`}
                >
                  <button
                    onClick={() => toggleSection(index)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-opacity-80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{section.icon}</span>
                      <div className="flex-1">
                        <h4 className={`font-semibold ${getTextStyle(section.type)}`}>
                          {section.title}
                        </h4>
                        {!expandedSections.has(index) && (
                          <p className={`text-sm ${getTextStyle(section.type)} opacity-60 truncate max-w-md`}>
                            {section.content.split('\n')[0].substring(0, 80)}...
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${getTextStyle(section.type)} opacity-70`}>
                        {expandedSections.has(index) ? 'Hide details' : 'Show details'}
                      </span>
                      <svg
                        className={`w-5 h-5 ${getTextStyle(section.type)} transition-transform duration-200 ${
                          expandedSections.has(index) ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  
                  {expandedSections.has(index) && (
                    <div className="px-4 pb-4 border-t border-gray-200 border-opacity-50">
                      <div className="mt-3">
                        <p className={`${getTextStyle(section.type)} opacity-90 whitespace-pre-wrap leading-relaxed`}>
                          {section.content}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Overall Feedback</h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-500 italic">
                Feedback is being generated. Please refresh the page in a few moments or click "Regenerate Scores" above.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Question-by-Question Results */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Question-by-Question Breakdown</h2>
        
        {questionResults.map((result, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-500">Question {index + 1}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getQuestionTypeColor(result.questionType)}`}>
                    {result.questionType}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  {result.question}
                </h3>
              </div>
              
              <div className="text-right ml-4">
                <div className={`text-2xl font-bold ${getScoreColor(result.score)}`}>
                  {result.score ? `${result.score}/10` : "N/A"}
                </div>
                <div className="text-sm text-gray-500">
                  Time: {formatTime(result.timeSpent)}
                </div>
                {!result.score && (
                  <div className="text-xs text-gray-400 mt-1">
                    Scoring pending
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Your Answer:</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {result.answer || "No answer provided"}
                  </p>
                </div>
              </div>

              {result.feedback ? (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Feedback:</h4>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-gray-700">{result.feedback}</p>
                  </div>
                  
                  {/* Add improvement tips based on score */}
                  {result.score && result.score < 7 && (
                    <div className="mt-3 bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                      <h5 className="text-sm font-medium text-yellow-800 mb-1">💡 Quick Tips:</h5>
                      <div className="text-xs text-yellow-700">
                        {result.questionType === 'behavioral' && (
                          <p>• Use the STAR method: Situation → Task → Action → Result</p>
                        )}
                        {result.questionType === 'technical' && (
                          <p>• Explain your thought process and mention specific technologies</p>
                        )}
                        {result.questionType === 'situational' && (
                          <p>• Walk through your problem-solving approach step-by-step</p>
                        )}
                        {result.questionType === 'coding' && (
                          <p>• Discuss time complexity and alternative solutions</p>
                        )}
                        <p>• Include specific examples and quantify your impact when possible</p>
                      </div>
                    </div>
                  )}

                  {/* Add example answer for very low scores */}
                  {result.score && result.score < 5 && (
                    <div className="mt-3 bg-green-50 rounded-lg p-3 border border-green-200">
                      <h5 className="text-sm font-medium text-green-800 mb-2">📋 Example Strong Answer Framework:</h5>
                      <div className="text-xs text-green-700">
                        {result.questionType === 'behavioral' && (
                          <div>
                            <p className="font-medium">Structure: STAR Method</p>
                            <p>• <strong>Situation:</strong> "In my previous role as [position] at [company]..."</p>
                            <p>• <strong>Task:</strong> "I was responsible for [specific challenge]..."</p>
                            <p>• <strong>Action:</strong> "I took the following steps: [detailed actions]..."</p>
                            <p>• <strong>Result:</strong> "This resulted in [quantified outcome]..."</p>
                          </div>
                        )}
                        {result.questionType === 'technical' && (
                          <div>
                            <p className="font-medium">Include:</p>
                            <p>• Define the concept clearly</p>
                            <p>• Explain when/why it's used</p>
                            <p>• Give a concrete example</p>
                            <p>• Mention tools/technologies</p>
                            <p>• Discuss benefits and trade-offs</p>
                          </div>
                        )}
                        {result.questionType === 'situational' && (
                          <div>
                            <p className="font-medium">Approach:</p>
                            <p>• Clarify the situation and constraints</p>
                            <p>• Outline your analysis process</p>
                            <p>• Explain your decision-making criteria</p>
                            <p>• Describe your action plan</p>
                            <p>• Mention how you'd measure success</p>
                          </div>
                        )}
                        {result.questionType === 'coding' && (
                          <div>
                            <p className="font-medium">Cover:</p>
                            <p>• Understand the problem (ask clarifying questions)</p>
                            <p>• Explain your approach and algorithm</p>
                            <p>• Write clean, readable code</p>
                            <p>• Analyze time and space complexity</p>
                            <p>• Discuss edge cases and testing</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Feedback:</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-500 italic">
                      Feedback is being generated...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Interview Summary</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {questionResults.length}
            </div>
            <div className="text-sm text-gray-600">Questions</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatTime(questionResults.reduce((sum, r) => sum + r.timeSpent, 0))}
            </div>
            <div className="text-sm text-gray-600">Total Time</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {Math.round((questionResults.reduce((sum, r) => sum + r.timeSpent, 0) / questionResults.length) / 60 * 10) / 10}
            </div>
            <div className="text-sm text-gray-600">Avg Time (min)</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {new Date(interview.completedAt!).toLocaleDateString()}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
        </div>
      </div>
    </div>
  );
}
