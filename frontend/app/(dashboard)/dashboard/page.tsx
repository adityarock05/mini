"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth";
import { grievancesApi, coursesApi, opportunitiesApi } from "@/lib/api";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    grievances: 0,
    courses: 0,
    applications: 0,
    tasks: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [
          grievances,
          enrollments,
          applications,
          tasks
        ] = await Promise.all([
          grievancesApi.list(), // Fetch all grievances, filter locally
          coursesApi.getMyEnrollments(),
          opportunitiesApi.getMyApplications(),
          opportunitiesApi.getMyTasks({ status: "PENDING" })
        ]);

        const activeGrievances = grievances.filter((g: any) => g.status !== "RESOLVED");

        setStats({
          grievances: activeGrievances.length,
          courses: enrollments.length,
          applications: applications.length,
          tasks: tasks.length
        });
      } catch (error) {
        console.error("Failed to load dashboard stats", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      loadStats();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  return (
    <div className="space-y-8 font-mono">
      <div>
        <h1 className="text-4xl font-bold text-primary uppercase tracking-tighter">Dashboard</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Welcome back, <span className="text-foreground font-bold">{user?.display_name || "User"}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-primary shadow-[4px_4px_0px_0px_rgba(57,255,20,0.5)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase text-primary tracking-wider">Active Grievances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground">{stats.grievances}</div>
            <p className="text-xs text-muted-foreground uppercase pt-1">
              {stats.grievances === 0 ? "No active issues" : "Pending resolution"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-secondary shadow-[4px_4px_0px_0px_rgba(255,0,255,0.5)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase text-secondary tracking-wider">Enrolled Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground">{stats.courses}</div>
            <p className="text-xs text-muted-foreground uppercase pt-1">
              {stats.courses === 0 ? "No enrollments" : "Active classes"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-500 shadow-[4px_4px_0px_0px_rgba(59,130,246,0.5)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase text-blue-500 tracking-wider">Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground">{stats.applications}</div>
            <p className="text-xs text-muted-foreground uppercase pt-1">
              {stats.applications === 0 ? "No applications" : "Pending review"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-yellow-500 shadow-[4px_4px_0px_0px_rgba(234,179,8,0.5)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase text-yellow-500 tracking-wider">Pending Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground">{stats.tasks}</div>
            <p className="text-xs text-muted-foreground uppercase pt-1">
              {stats.tasks === 0 ? "All caught up" : "Due soon"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="border-b-2 border-border pb-4">
            <CardTitle className="uppercase tracking-wider text-xl">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <a
              href="/grievances/new"
              className="group block p-4 bg-card border-2 border-primary hover:bg-primary transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-primary group-hover:text-black uppercase">Submit Grievance</h3>
                  <p className="text-sm text-muted-foreground group-hover:text-black/80">
                    Report an issue or concern
                  </p>
                </div>
                <ArrowRight className="text-primary group-hover:text-black w-6 h-6 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </a>

            <a
              href="/opportunities"
              className="group block p-4 bg-card border-2 border-secondary hover:bg-secondary transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-secondary group-hover:text-black uppercase">Browse Opportunities</h3>
                  <p className="text-sm text-muted-foreground group-hover:text-black/80">
                    Find internships and research positions
                  </p>
                </div>
                <ArrowRight className="text-secondary group-hover:text-black w-6 h-6 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </a>

            <a
              href="/courses"
              className="group block p-4 bg-card border-2 border-blue-500 hover:bg-blue-500 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-blue-500 group-hover:text-black uppercase">View Courses</h3>
                  <p className="text-sm text-muted-foreground group-hover:text-black/80">
                    Access study materials and resources
                  </p>
                </div>
                <ArrowRight className="text-blue-500 group-hover:text-black w-6 h-6 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b-2 border-border pb-4">
            <CardTitle className="uppercase tracking-wider text-xl">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-muted-foreground/20 bg-muted/20">
              <p className="text-muted-foreground text-center font-mono uppercase tracking-widest text-sm">
                No recent activity
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
