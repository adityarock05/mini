"use client";

import { useState, use, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, MapPin, User, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth";
import { Label } from "@/components/ui/label";
import { grievancesApi } from "@/lib/api";
import { toast } from "sonner";

// Interfaces mirroring the backend response
interface GrievanceUpdate {
  id: string;
  status: string;
  remark: string;
  created_at: string;
  updated_by: { id: string; name: string }; // Backend returns a dict with id and name
}

interface Grievance {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  location: string;
  status: string;
  is_anonymous: boolean;
  submitter_id: string | null;
  submitter?: {
    display_name: string;
  };
  created_at: string;
  updated_at: string;
  updates: GrievanceUpdate[];
}

const statusColors: Record<string, string> = {
  SUBMITTED: "bg-yellow-100 text-yellow-800",
  UNDER_REVIEW: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-purple-100 text-purple-800",
  RESOLVED: "bg-green-100 text-green-800",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
};

export default function GrievanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuthStore();
  const [grievance, setGrievance] = useState<Grievance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status update state
  const [newStatus, setNewStatus] = useState<string>("");
  const [remark, setRemark] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadGrievance();
  }, [id]);

  useEffect(() => {
    if (grievance) {
      setNewStatus(grievance.status);
    }
  }, [grievance]);

  const handleUpdateStatus = async () => {
    if (!grievance) return;

    try {
      setIsUpdating(true);
      await grievancesApi.addUpdate(grievance.id, {
        status: newStatus,
        remark: remark || "Status updated",
      });
      toast.success("Status updated successfully");
      setRemark("");
      loadGrievance(); // Reload to show new status and timeline
    } catch (err: any) {
      console.error("Failed to update status:", err);
      toast.error(err.response?.data?.detail || "Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const loadGrievance = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await grievancesApi.get(id);
      setGrievance(data);
    } catch (err: any) {
      console.error("Failed to load grievance:", err);
      setError("Failed to load grievance details. Please try again.");
      toast.error("Failed to load grievance details");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-500">Loading grievance details...</p>
      </div>
    );
  }

  if (error || !grievance) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/grievances"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Grievances
          </Link>
        </div>
        <Card className="p-8 text-center">
          <CardContent>
            <p className="text-red-500 mb-4">{error || "Grievance not found"}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/grievances"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Grievances
        </Link>
      </div>

      <div className="space-y-6">
        {/* Main Grievance Card */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge className={statusColors[grievance.status]}>
                    {grievance.status.replace("_", " ")}
                  </Badge>
                  <Badge className={priorityColors[grievance.priority]}>
                    {grievance.priority} Priority
                  </Badge>
                </div>
                <CardTitle className="text-xl">{grievance.title}</CardTitle>
              </div>
              <div className="text-sm text-gray-500">
                <span>ID: {grievance.id.substring(0, 8)}...</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Meta Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-4 h-4" />
                <span>
                  {grievance.is_anonymous
                    ? "Anonymous"
                    : (grievance.submitter?.display_name || "Unknown User")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{grievance.location}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{new Date(grievance.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{grievance.description}</p>
            </div>

            {/* Category */}
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Category</h3>
              <Badge variant="outline">{grievance.category}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Status Update Section - Only for Authority/Admin */}
        {(user?.role === "AUTHORITY" || user?.role === "ADMIN") && (
          <Card>
            <CardHeader>
              <CardTitle>Update Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">New Status</Label>
                    <div className="relative">
                      <select
                        id="status"
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                      >
                        <option value="SUBMITTED">Submitted</option>
                        <option value="UNDER_REVIEW">Under Review</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remark">Remark</Label>
                  <textarea
                    id="remark"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Add a remark about this update..."
                    value={remark}
                    onChange={(e: any) => setRemark(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleUpdateStatus}
                  disabled={isUpdating || newStatus === grievance.status && !remark}
                >
                  {isUpdating ? "Updating..." : "Update Status"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Status Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {grievance.updates && grievance.updates.length > 0 ? (
                grievance.updates.map((update, index) => (
                  <div key={update.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-3 h-3 rounded-full ${index === 0 ? "bg-gray-300" : "bg-blue-500"
                          }`}
                      />
                      {index < grievance.updates.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-200 mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mb-1">
                        <Badge className={statusColors[update.status]}>
                          {update.status.replace("_", " ")}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(update.created_at).toLocaleString()}
                        </span>
                        {update.updated_by?.name && (
                          <span className="text-sm text-gray-400">by {update.updated_by.name}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{update.remark}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 italic">No updates have been recorded yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}