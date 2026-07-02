"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Clock, MapPin } from "lucide-react";

// Mock Data
const events = [
    {
        id: 1,
        title: "Hackathon 2026: Kickoff",
        date: "2026-03-10",
        time: "09:00 AM",
        location: "Auditorium",
        type: "EVENT",
    },
    {
        id: 2,
        title: "Mid-Semester Break Starts",
        date: "2026-03-14",
        time: "All Day",
        location: "Campus-wide",
        type: "HOLIDAY",
    },
    {
        id: 3,
        title: "Guest Lecture: Quantum Comp.",
        date: "2026-03-20",
        time: "02:00 PM",
        location: "L2, North Campus",
        type: "ACADEMIC",
    },
    {
        id: 4,
        title: "Senate Meeting",
        date: "2026-03-25",
        time: "04:00 PM",
        location: "Conference Room A",
        type: "ADMIN",
    }
];

export default function CalendarPage() {
    return (
        <div className="space-y-8 font-mono">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-primary uppercase tracking-tighter">Academic Calendar</h1>
                    <p className="text-muted-foreground mt-2 text-lg">
                        Upcoming Events & Deadlines
                    </p>
                </div>
                <div className="hidden md:block text-right">
                    <p className="text-6xl font-bold text-foreground opacity-10">2026</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {events.map((event) => (
                    <div key={event.id} className="group flex items-stretch bg-card border-l-4 border-l-primary border-y border-r border-border hover:border-r-primary hover:border-y-primary hover:translate-x-1 transition-all">
                        {/* Date Block */}
                        <div className="p-6 bg-muted/30 flex flex-col items-center justify-center min-w-[120px]">
                            <span className="text-3xl font-bold">{event.date.split('-')[2]}</span>
                            <span className="text-xs uppercase tracking-widest">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                        </div>

                        {/* Event Details */}
                        <div className="flex-1 p-6 flex flex-col justify-center">
                            <div className="flex items-center gap-3 mb-2">
                                <Badge variant="outline" className="border-primary text-primary">
                                    {event.type}
                                </Badge>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground uppercase tracking-wider">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {event.time}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> {event.location}
                                    </span>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold uppercase group-hover:text-primary transition-colors">
                                {event.title}
                            </h3>
                        </div>

                        {/* Action */}
                        <div className="w-16 flex items-center justify-center border-l border-border group-hover:bg-primary group-hover:text-black transition-colors cursor-pointer">
                            <ArrowRight className="w-6 h-6" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
