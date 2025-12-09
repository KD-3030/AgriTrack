'use client';

import { useState } from 'react';
import { Star, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react';

interface FeedbackFormProps {
  bookingId: string;
  farmerId: string;
  operatorId: string;
  machineId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function FeedbackForm({
  bookingId,
  farmerId,
  operatorId,
  machineId,
  onSuccess,
  onCancel
}: FeedbackFormProps) {
  const [approved, setApproved] = useState<boolean | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (approved === null) {
      setError('Please select whether you approve the work or not');
      return;
    }

    if (!approved && !rejectionReason.trim()) {
      setError('Please provide a reason for rejecting the work');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/v1/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: bookingId,
          farmer_id: farmerId,
          operator_id: operatorId,
          machine_id: machineId,
          approved,
          rating: approved ? rating : null,
          service_quality: null,
          timeliness: null,
          machine_condition: null,
          operator_behavior: null,
          review_text: approved ? reviewText : null,
          would_recommend: approved ? wouldRecommend : false,
          work_quality: null,
          rejection_reason: !approved ? rejectionReason : null
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      alert(data.message || (approved ? 'Work completed! Thank you for your feedback.' : 'Feedback submitted. The operator will be notified.'));
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const StarRating = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none"
          >
            <Star
              className={`w-8 h-8 ${star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">Work Completion Feedback</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Approval Question */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-lg mb-3">Is the work completed to your satisfaction?</h3>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setApproved(true)}
            className={`flex-1 py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
              approved === true
                ? 'bg-green-500 text-white shadow-lg'
                : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-green-500'
            }`}
          >
            <ThumbsUp className="w-5 h-5" />
            Yes, Work is OK
          </button>
          <button
            type="button"
            onClick={() => setApproved(false)}
            className={`flex-1 py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
              approved === false
                ? 'bg-red-500 text-white shadow-lg'
                : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-red-500'
            }`}
          >
            <ThumbsDown className="w-5 h-5" />
            No, Needs Redo
          </button>
        </div>
      </div>

      {/* If Approved - Show Rating Form */}
      {approved === true && (
        <div className="space-y-4">
          <StarRating value={rating} onChange={setRating} label="Work Quality Rating | कार्य गुणवत्ता रेटिंग" />

          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={wouldRecommend}
                onChange={(e) => setWouldRecommend(e.target.checked)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">I would recommend this operator</span>
            </label>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Review (Optional)
            </label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              placeholder="Share your experience..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* If Not Approved - Show Rejection Reason */}
      {approved === false && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Why is the work not satisfactory? <span className="text-red-500">*</span>
          </label>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
            required
            placeholder="Please explain what needs to be fixed..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            The operator will be notified and the booking will remain pending until the work is redone.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 mt-6">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading || approved === null}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Submitting...' : approved ? 'Submit Feedback & Complete' : 'Submit & Request Redo'}
        </button>
      </div>
    </form>
  );
}
