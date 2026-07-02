"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Calendar as CalendarIcon, Pin } from "lucide-react";

// Mock Data
const notices = [
    {
        id: 1,
        title: "End Semester Examination Schedule",
        date: "2026-05-15",
        category: "ACADEMIC",
        author: "Academic Section",
        content: "The final datesheet for the Spring 2026 End Semester Examinations has been released. Please check the website for details.",
        pinned: true,
    },
    {
        id: 2,
        title: "Inter-IIT Sports Meet Selection",
        date: "2026-04-20",
        category: "SPORTS",
        author: "Sports Secretary",
        content: "Trials for the Inter-IIT Sports Meet will begin next week at the North Campus ground.",
        pinned: false,
    },
    {
        id: 3,
        title: "Guest Lecture: AI in Healthcare",
        date: "2026-04-18",
        category: "EVENT",
        author: "CS Department",
        content: "Dr. A. Sharma will be delivering a talk on the applications of AI in modern healthcare systems.",
        pinned: false,
    },
    {
        id: 4,
        title: "Hostel Maintenance Warning",
        date: "2026-04-10",
        category: "HOSTEL",
        author: "Warden, B14",
        content: "Scheduled water tank cleaning will take place on Saturday. Water supply will be disrupted from 10 AM to 2 PM.",
        pinned: false,
    }
];

export default function NoticeboardPage() {
    return (
        <div className="space-y-8 font-mono">
            <div>
                <h1 className="text-4xl font-bold text-primary uppercase tracking-tighter">Noticeboard</h1>
                <p className="text-muted-foreground mt-2 text-lg">
                    Campus Announcements & Updates
                </p>
            </div>

            <div className="grid gap-6">
                {notices.map((notice) => (
                    <Card key={notice.id} className="border-2 border-border hover:border-primary transition-all duration-300 group">
                        <div className="flex flex-col md:flex-row">
                            {/* Date Box */}
                            <div className="bg-muted p-6 flex flex-col items-center justify-center min-w-[150px] border-b-2 md:border-b-0 md:border-r-2 border-border group-hover:bg-primary group-hover:text-black transition-colors">
                                <span className="text-3xl font-bold">{new Date(notice.date).getDate()}</span>
                                <span className="text-sm font-bold uppercase tracking-widest">
                                    {new Date(notice.date).toLocaleString('default', { month: 'short' })}
                                </span>
                                <span className="text-xs opacity-70 mt-1">{new Date(notice.date).getFullYear()}</span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 p-6 relative">
                                {notice.pinned && (
                                    <Pin className="absolute top-6 right-6 w-5 h-5 text-secondary rotate-45 transform" />
                                )}

                                <div className="flex items-center gap-3 mb-3">
                                    <Badge variant={notice.category === 'ACADEMIC' ? 'default' : 'secondary'}>
                                        {notice.category}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground uppercase flex items-center gap-1">
                                        <Megaphone className="w-3 h-3" />
                                        {notice.author}
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold uppercase mb-2 group-hover:text-primary transition-colors">
                                    {notice.title}
                                </h3>
                                <p className="text-muted-foreground text-sm leading-relaxed max-w-3xl">
                                    {notice.content}
                                </p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
