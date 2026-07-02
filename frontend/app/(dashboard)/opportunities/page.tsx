"use client";


import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Search, Filter, Calendar, DollarSign, Clock, Plus } from "lucide-react";
import Link from "next/link";
import { opportunitiesApi } from "@/lib/api";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth";

interface Opportunity {
  id: string;
  title: string;
  description: string;
  faculty_name: string;
  skills: string[];
  duration: string;
  stipend: string | null;
  deadline: string;
  is_open: boolean;
}

export default function OpportunitiesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (user) {
      loadOpportunities();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const loadOpportunities = async () => {
    try {
      setIsLoading(true);
      const data = await opportunitiesApi.list({ is_open: true });
      setOpportunities(data);
    } catch (error: any) {
      toast.error("Failed to load opportunities");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOpportunities = opportunities.filter(
    (opp) =>
      opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.skills.some((skill) => skill.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-primary uppercase tracking-tighter">Opportunities</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Find internships and research positions
          </p>
        </div>

        {(user?.role === "FACULTY" || user?.role === "AUTHORITY" || user?.role === "ADMIN") && (
          <Button onClick={() => router.push("/opportunities/create")}>
            <Plus className="w-4 h-4 mr-2" />
            Post Opportunity
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search opportunities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button variant="outline" className="w-full sm:w-auto">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              <p>Loading opportunities...</p>
            </div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No opportunities available yet.</p>
              <p className="text-sm mt-1">
                Check back later for new postings.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredOpportunities.map((opportunity) => (
                <Link
                  key={opportunity.id}
                  href={`/opportunities/${opportunity.id}`}
                  className="block p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-lg text-gray-900">
                        {opportunity.title}
                      </h3>
                      <Badge variant={opportunity.is_open ? "default" : "secondary"}>
                        {opportunity.is_open ? "Open" : "Closed"}
                      </Badge>
                    </div>
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {opportunity.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {opportunity.skills.map((skill) => (
                        <Badge key={skill} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        <span>{opportunity.faculty_name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{opportunity.duration}</span>
                      </div>
                      {opportunity.stipend && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          <span>{opportunity.stipend}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Deadline: {new Date(opportunity.deadline).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div >
  );
}
