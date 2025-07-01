import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CreateInterviewForm } from "./CreateInterviewForm";
import { InterviewList } from "./InterviewList";
import { InterviewSession } from "./InterviewSession";
import { InterviewResults } from "./InterviewResults";
import { Id } from "../../convex/_generated/dataModel";

type View = "dashboard" | "create" | "interview" | "results";

export function InterviewDashboard() {
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [selectedInterviewId, setSelectedInterviewId] = useState<Id<"interviews"> | null>(null);
  
  const interviews = useQuery(api.interviews.getUserInterviews);
  const user = useQuery(api.auth.loggedInUser);

  const handleStartInterview = (interviewId: Id<"interviews">) => {
    setSelectedInterviewId(interviewId);
    setCurrentView("interview");
  };

  const handleViewResults = (interviewId: Id<"interviews">) => {
    setSelectedInterviewId(interviewId);
    setCurrentView("results");
  };

  const handleInterviewComplete = () => {
    setCurrentView("results");
  };

  const handleBackToDashboard = () => {
    setCurrentView("dashboard");
    setSelectedInterviewId(null);
  };

  if (currentView === "create") {
    return (
      <CreateInterviewForm
        onBack={handleBackToDashboard}
        onSuccess={handleBackToDashboard}
      />
    );
  }

  if (currentView === "interview" && selectedInterviewId) {
    return (
      <InterviewSession
        interviewId={selectedInterviewId}
        onComplete={handleInterviewComplete}
        onBack={handleBackToDashboard}
      />
    );
  }

  if (currentView === "results" && selectedInterviewId) {
    return (
      <InterviewResults
        interviewId={selectedInterviewId}
        onBack={handleBackToDashboard}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">
          Welcome back, {user?.email?.split('@')[0] || 'there'}!
        </h1>
        <p className="text-xl text-secondary mb-8">
          Practice your interview skills with AI-powered mock interviews
        </p>
        
        <button
          onClick={() => setCurrentView("create")}
          className="bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-hover transition-colors shadow-lg"
        >
          Start New Interview
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Total Interviews</h3>
          <p className="text-3xl font-bold text-primary">{interviews?.length || 0}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Completed</h3>
          <p className="text-3xl font-bold text-green-600">
            {interviews?.filter(i => i.status === "completed").length || 0}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Average Score</h3>
          <p className="text-3xl font-bold text-blue-600">
            {interviews?.filter(i => i.score).length 
              ? Math.round((interviews.filter(i => i.score).reduce((sum, i) => sum + (i.score || 0), 0) / interviews.filter(i => i.score).length) * 10) / 10
              : "N/A"
            }
          </p>
        </div>
      </div>

      <InterviewList
        interviews={interviews || []}
        onStartInterview={handleStartInterview}
        onViewResults={handleViewResults}
      />
    </div>
  );
}
