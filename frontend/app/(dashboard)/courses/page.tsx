"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, FileText, Plus } from "lucide-react";
import Link from "next/link";
import { coursesApi } from "@/lib/api";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth";

interface Course {
  id: string;
  code: string;
  name: string;
  credits: number;
  department: string;
  description: string | null;
  enrollment_count: number;
  professor_name: string | null;
  professor_id: string | null;
  semester: string;
}

export default function CoursesPage() {
  const { user } = useAuthStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  useEffect(() => {
    if (user) {
      loadCourses();
    }
  }, [departmentFilter, user]);

  const loadCourses = async () => {
    try {
      setIsLoading(true);
      const params: { department?: string } = {};
      if (departmentFilter) {
        params.department = departmentFilter;
      }

      // Fetch courses and enrollments in parallel
      const [coursesjs, enrollments] = await Promise.all([
        coursesApi.list(params),
        (user?.role === "STUDENT" || user?.role === "FACULTY") ? coursesApi.getMyEnrollments() : Promise.resolve([])
      ]);

      const enrolledIds = new Set(enrollments.map((e: any) => e.course_id));
      setEnrolledCourseIds(enrolledIds as Set<string>);
      setCourses(coursesjs);
    } catch (error: any) {
      toast.error("Failed to load courses");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCourses = courses.filter(
    (course) =>
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.description && course.description.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => {
    // 1. Created courses (Professor)
    const aCreated = a.professor_id === user?.id;
    const bCreated = b.professor_id === user?.id;
    if (aCreated && !bCreated) return -1;
    if (!aCreated && bCreated) return 1;

    // 2. Enrolled courses
    const aEnrolled = enrolledCourseIds.has(a.id);
    const bEnrolled = enrolledCourseIds.has(b.id);
    if (aEnrolled && !bEnrolled) return -1;
    if (!aEnrolled && bEnrolled) return 1;

    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-primary uppercase tracking-tighter">Courses</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Browse courses and access study materials
          </p>
        </div>

        {(user?.role === "FACULTY" || user?.role === "ADMIN") && (
          <Link href="/courses/create">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Course
            </Button>
          </Link>
        )}
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Departments</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Physics">Physics</option>
              <option value="Electrical Engineering">Electrical Engineering</option>
              <option value="Mechanical Engineering">Mechanical Engineering</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Course Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading courses...</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No courses found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <Link key={course.id} href={`/courses/${course.id}`}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-2">
                      <Badge variant="secondary">{course.code}</Badge>
                      {course.professor_id === user?.id && (
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Created</Badge>
                      )}
                      {enrolledCourseIds.has(course.id) && (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Enrolled</Badge>
                      )}
                    </div>
                    <Badge>{course.credits} Credits</Badge>
                  </div>
                  <CardTitle className="text-lg mt-2">{course.name}</CardTitle>
                  <p className="text-sm text-gray-500">{course.department}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {course.description || "No description available"}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{course.enrollment_count}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      <span>Resources</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">Prof:</span> {course.professor_name || "TBA"}
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">Semester:</span> {course.semester}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
