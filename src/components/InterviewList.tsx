import { Doc } from "../../convex/_generated/dataModel";

interface InterviewListProps {
  interviews: Doc<"interviews">[];
  onStartInterview: (id: Doc<"interviews">["_id"]) => void;
  onViewResults: (id: Doc<"interviews">["_id"]) => void;
}

export function InterviewList({ interviews, onStartInterview, onViewResults }: InterviewListProps) {
  if (interviews.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">No interviews yet</h3>
        <p className="text-gray-600">Create your first mock interview to get started!</p>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-700";
      case "intermediate":
        return "bg-yellow-100 text-yellow-700";
      case "advanced":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">Your Interviews</h2>
      
      <div className="grid gap-4">
        {interviews.map((interview) => (
          <div key={interview._id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">
                  {interview.title}
                </h3>
                <p className="text-gray-600 mb-2">
                  {interview.jobRole}
                  {interview.company && ` at ${interview.company}`}
                </p>
                <div className="flex gap-2 mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(interview.status)}`}>
                    {interview.status.replace("_", " ").toUpperCase()}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(interview.difficulty)}`}>
                    {interview.difficulty.toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div className="text-right">
                {interview.score && (
                  <div className="text-2xl font-bold text-primary mb-1">
                    {interview.score}/10
                  </div>
                )}
                <div className="text-sm text-gray-500">
                  {interview.currentQuestionIndex}/{interview.totalQuestions} questions
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Created: {formatDate(interview._creationTime)}
                {interview.completedAt && (
                  <span className="ml-4">
                    Completed: {formatDate(interview.completedAt)}
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                {interview.status === "completed" ? (
                  <button
                    onClick={() => onViewResults(interview._id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    View Results
                  </button>
                ) : interview.status === "in_progress" ? (
                  <button
                    onClick={() => onStartInterview(interview._id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    onClick={() => onStartInterview(interview._id)}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm"
                  >
                    Start Interview
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
