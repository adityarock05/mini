"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Filter, Search } from "lucide-react";
import Link from "next/link";
import { grievancesApi } from "@/lib/api";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth";

interface Grievance {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  location: string;
  status: string;
  is_anonymous: boolean;
  submitter_name: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  SUBMITTED: "bg-blue-100 text-blue-800",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-orange-100 text-orange-800",
  RESOLVED: "bg-green-100 text-green-800",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
};

export default function GrievancesPage() {
  const { user } = useAuthStore();
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    if (user) {
      loadGrievances();
    } else {
      setIsLoading(false);
    }
  }, [statusFilter, user]);

  const loadGrievances = async () => {
    try {
      setIsLoading(true);
      const params: { status?: string } = {};
      if (statusFilter) {
        params.status = statusFilter;
      }
      const data = await grievancesApi.list(params);
      setGrievances(data);
    } catch (error: any) {
      toast.error("Failed to load grievances");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredGrievances = grievances.filter(
    (g) =>
      g.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-primary uppercase tracking-tighter">Grievances</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Submit and track your campus issues
          </p>
        </div>
        <Link href="/grievances/new">
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Submit Grievance
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search grievances..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              <p>Loading grievances...</p>
            </div>
          ) : filteredGrievances.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No grievances found.</p>
              <p className="text-sm mt-1">
                Click "Submit Grievance" to report an issue.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredGrievances.map((grievance) => (
                <Link
                  key={grievance.id}
                  href={`/grievances/${grievance.id}`}
                  className="block p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {grievance.title}
                        </h3>
                        {grievance.is_anonymous && (
                          <Badge variant="secondary">Anonymous</Badge>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                        {grievance.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                        <Badge className={priorityColors[grievance.priority]}>
                          {grievance.priority}
                        </Badge>
                        <Badge variant="outline">{grievance.category}</Badge>
                        <span>•</span>
                        <span>{grievance.location}</span>
                        {!grievance.is_anonymous && grievance.submitter_name && (
                          <>
                            <span>•</span>
                            <span>{grievance.submitter_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={statusColors[grievance.status]}>
                        {grievance.status.replace("_", " ")}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {new Date(grievance.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
