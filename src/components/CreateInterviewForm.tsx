import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface CreateInterviewFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function CreateInterviewForm({ onBack, onSuccess }: CreateInterviewFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    jobRole: "",
    company: "",
    difficulty: "intermediate" as "beginner" | "intermediate" | "advanced",
    totalQuestions: 5,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createInterview = useMutation(api.interviews.createInterview);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.jobRole.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    
    try {
      await createInterview({
        title: formData.title.trim(),
        jobRole: formData.jobRole.trim(),
        company: formData.company.trim() || undefined,
        difficulty: formData.difficulty,
        totalQuestions: formData.totalQuestions,
      });
      
      toast.success("Interview created successfully! Questions are being generated...");
      onSuccess();
    } catch (error) {
      console.error("Error creating interview:", error);
      toast.error("Failed to create interview. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Create New Interview</h2>
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Back
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Interview Title *
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Frontend Developer Interview"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow"
              required
            />
          </div>

          <div>
            <label htmlFor="jobRole" className="block text-sm font-medium text-gray-700 mb-2">
              Job Role *
            </label>
            <input
              type="text"
              id="jobRole"
              value={formData.jobRole}
              onChange={(e) => setFormData({ ...formData, jobRole: e.target.value })}
              placeholder="e.g., Software Engineer, Product Manager, Data Scientist"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow"
              required
            />
          </div>

          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
              Company (Optional)
            </label>
            <input
              type="text"
              id="company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="e.g., Google, Microsoft, Startup"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow"
            />
          </div>

          <div>
            <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-2">
              Difficulty Level
            </label>
            <select
              id="difficulty"
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow"
            >
              <option value="beginner">Beginner (0-2 years experience)</option>
              <option value="intermediate">Intermediate (2-5 years experience)</option>
              <option value="advanced">Advanced (5+ years experience)</option>
            </select>
          </div>

          <div>
            <label htmlFor="totalQuestions" className="block text-sm font-medium text-gray-700 mb-2">
              Number of Questions
            </label>
            <select
              id="totalQuestions"
              value={formData.totalQuestions}
              onChange={(e) => setFormData({ ...formData, totalQuestions: parseInt(e.target.value) })}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow"
            >
              <option value={3}>3 Questions (Quick Practice)</option>
              <option value={5}>5 Questions (Standard)</option>
              <option value={8}>8 Questions (Comprehensive)</option>
              <option value={10}>10 Questions (Full Interview)</option>
            </select>
          </div>

          {/* Question Generation Info */}
          <div className="bg-blue-50 rounded-lg p-4 mt-4">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">✨ Smart Question Generation</h4>
            <div className="text-xs text-blue-700 space-y-1">
              <p>• Questions are tailored to your specific job role</p>
              <p>• Each interview features unique, non-repetitive questions</p>
              <p>• Mix of technical, behavioral, situational, and coding questions</p>
              <p>• Difficulty and timing adjusted based on your experience level</p>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating..." : "Create Interview"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
