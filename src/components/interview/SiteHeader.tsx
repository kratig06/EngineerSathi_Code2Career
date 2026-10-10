'use client';

import { useInterviewStore } from '@/store/interviewStore';
import { Button } from '@/components/ui/button';
import { Brain, FileText, Map, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SiteHeader() {
  const { stage, setStage } = useInterviewStore();
  const [showProfile, setShowProfile] = useState(false);
  const [profileName, setProfileName] = useState('Karan');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/profile').then(r => r.ok && r.json()).then(data => {
      if (data?.displayName) setProfileName(data.displayName);
    }).catch(console.error);
  }, []);

  const saveProfile = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: profileName }),
      });
    } finally {
      setIsSaving(false);
      setShowProfile(false);
    }
  };

  // Hide header during active interview or readiness check
  if (stage === 'interview' || stage === 'readiness' || stage === 'round_intro' || stage === 'round_results' || stage === 'resumes' || stage === 'roadmap') {
    return null;
  }


  return (
    <>
      <header className="relative z-50 w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setStage('landing')}>
          <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center border border-primary/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <span className="font-outfit font-bold text-xl tracking-tight text-white drop-shadow-md">
            Engineer <span className="text-primary">Saathi</span>
          </span>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4 bg-blue-950/30 backdrop-blur-md px-2 py-1.5 rounded-full border border-white/10 shadow-lg">
          <Button variant="ghost" size="sm" onClick={() => setStage('resumes')} className="text-white/80 hover:text-white hover:bg-white/10 rounded-full h-9 px-4 gap-2 transition-colors">
            <FileText className="w-4 h-4" /> <span className="hidden sm:inline">Resume</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setStage('roadmap')} className="text-cyan-100/80 hover:text-cyan-50 hover:bg-cyan-500/10 rounded-full h-9 px-4 gap-2 transition-colors">
            <Map className="w-4 h-4" /> <span className="hidden sm:inline">Roadmap</span>
          </Button>
          
          <div className="h-6 w-px bg-white/20 mx-1" />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 bg-white/5 hover:bg-white/20 border border-white/10 overflow-hidden group">
                <User className="w-4 h-4 text-white/70 group-hover:text-white" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-blue-950/90 backdrop-blur-xl border-white/10 text-white">
              <DropdownMenuLabel>Hi, {profileName}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem className="focus:bg-white/10 cursor-pointer" onClick={() => setShowProfile(true)}>Profile Settings</DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-white/10 cursor-pointer" onClick={() => setStage('report')}>Interview History</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem className="focus:bg-white/10 cursor-pointer text-cyan-400">Sign In</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="sm:max-w-md bg-blue-950/90 border-cyan-500/30 backdrop-blur-xl text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-cyan-400">
              <User className="w-5 h-5" /> Profile Settings
            </DialogTitle>
            <DialogDescription className="text-blue-100/70">
              Manage your personal information.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-white/60">Display Name</Label>
              <Input
                id="displayName"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="bg-blue-900/50 border-white/10 text-white focus-visible:ring-cyan-500"
              />
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t border-white/10">
            <Button onClick={saveProfile} disabled={isSaving} className="gap-2 bg-cyan-500 hover:bg-cyan-400 text-blue-950 border-0 shadow-lg shadow-cyan-500/20">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
