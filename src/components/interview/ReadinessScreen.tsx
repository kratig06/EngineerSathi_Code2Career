'use client';

import { useState, useRef, useEffect } from 'react';
import { useInterviewStore } from '@/store/interviewStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Video, Mic, ShieldAlert, CheckCircle2, Play, Info } from 'lucide-react';
import { SetupLayout } from './SetupLayout';
import { BackButton } from '@/components/ui/back-button';

export function ReadinessScreen() {
  const { 
    targetRole, targetCompany, resumeFileName, language, voiceProfile, interviewMode, evaluationMode, structuredRounds,
    cameraConsent, micConsent, updateConsent, setStage 
  } = useInterviewStore();

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [camStatus, setCamStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>(cameraConsent ? 'granted' : 'idle');
  const [micStatus, setMicStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>(micConsent ? 'granted' : 'idle');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const requestMedia = async () => {
    setCamStatus('requesting');
    setMicStatus('requesting');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      
      const hasVideo = mediaStream.getVideoTracks().length > 0;
      const hasAudio = mediaStream.getAudioTracks().length > 0;
      
      setCamStatus(hasVideo ? 'granted' : 'denied');
      setMicStatus(hasAudio ? 'granted' : 'denied');
      
      updateConsent({ cameraConsent: hasVideo, micConsent: hasAudio });
    } catch (err) {
      console.error('Media devices error:', err);
      setCamStatus('denied');
      setMicStatus('denied');
      updateConsent({ cameraConsent: false, micConsent: false });
    }
  };

  const handleStart = async () => {
    if (camStatus !== 'granted' || micStatus !== 'granted') return;

    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      alert("Failed to enter full-screen mode. Your browser may not support it or requires explicit permission. Please proceed carefully.");
      console.warn("Fullscreen request failed", err);
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (interviewMode === 'Structured' && structuredRounds.length > 0) {
      setStage('round_intro');
    } else {
      setStage('interview');
    }
  };

  const isReady = camStatus === 'granted' && micStatus === 'granted';

  return (
    <SetupLayout>
      <div className="w-full max-w-5xl mx-auto py-6 flex flex-col h-full overflow-y-auto">
        <div className="mb-8 text-center relative z-10 drop-shadow-md">
          <h1 className="text-4xl font-outfit font-bold mb-3 tracking-tight text-white drop-shadow-lg">Final Readiness Check</h1>
          <p className="text-blue-100 text-lg drop-shadow">Review your setup, verify permissions, and start your session.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass-panel bg-blue-950/40 backdrop-blur-xl border-white/10 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-white">Permissions & Hardware</CardTitle>
                <CardDescription className="text-blue-200">Grant access to simulate a real interview environment.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-black/40 shadow-inner">
                      <div className="p-3 rounded-full bg-cyan-400/20 text-cyan-400">
                        <Video className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1 text-white">Camera Access</h4>
                        <p className="text-sm text-blue-200 mb-3">Required for proctoring checks.</p>
                        {camStatus === 'granted' ? (
                          <span className="text-green-400 text-sm font-semibold flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Granted</span>
                        ) : camStatus === 'denied' ? (
                          <span className="text-red-400 text-sm font-semibold">Denied / Unavailable</span>
                        ) : (
                          <Button variant="outline" size="sm" className="bg-black/40 text-white hover:bg-white/10 border-white/20" onClick={requestMedia} disabled={camStatus === 'requesting'}>Enable Devices</Button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-black/40 shadow-inner">
                      <div className="p-3 rounded-full bg-orange-500/20 text-orange-400">
                        <Mic className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1 text-white">Microphone Access</h4>
                        <p className="text-sm text-blue-200 mb-3">Required for voice mode. Used to listen to your answers.</p>
                        {micStatus === 'granted' ? (
                          <span className="text-green-400 text-sm font-semibold flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Granted</span>
                        ) : micStatus === 'denied' ? (
                          <span className="text-red-400 text-sm font-semibold">Denied. Required for interview.</span>
                        ) : (
                          <Button variant="outline" size="sm" className="bg-black/40 text-white hover:bg-white/10 border-white/20" onClick={requestMedia} disabled={micStatus === 'requesting'}>Enable Devices</Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-h-[200px] bg-black rounded-xl border border-white/10 overflow-hidden relative flex items-center justify-center shadow-lg">
                    {camStatus === 'granted' ? (
                      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover transform -scale-x-100" />
                    ) : (
                      <div className="text-center p-4">
                        <Video className="w-8 h-8 text-blue-200 mx-auto mb-2 opacity-50" />
                        <p className="text-sm text-blue-200">Camera preview will appear here</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel bg-blue-950/40 backdrop-blur-xl border-white/10 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-white">Interview Rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-blue-100">
                <p className="flex items-start gap-2"><Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" /> Listen carefully to each question before answering.</p>
                <p className="flex items-start gap-2"><Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" /> Answer aptitude questions within the displayed time limit.</p>
                <p className="flex items-start gap-2"><Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" /> Write and submit code using the provided coding editor for coding rounds.</p>
                <p className="flex items-start gap-2"><Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" /> Speak clearly during technical, HR, and GD-style exercises.</p>
                <p className="flex items-start gap-2 text-yellow-300"><ShieldAlert className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" /> <strong>Proctoring:</strong> Your camera and microphone are monitored locally for presence, device failures, and full-screen exits. No video is saved. A max of 5 warnings will terminate the session early.</p>
                {interviewMode === 'Structured' ? (
                  <>
                    <p className="flex items-start gap-2"><Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" /> Finish each round before moving to the next.</p>
                    {evaluationMode === 'Elimination' ? (
                      <p className="flex items-start gap-2 text-red-300"><Info className="w-4 h-4 text-red-400 shrink-0 mt-0.5" /> <strong>Elimination Mode:</strong> Failing a round's qualifying threshold ends progression.</p>
                    ) : (
                      <p className="flex items-start gap-2 text-green-300"><Info className="w-4 h-4 text-green-400 shrink-0 mt-0.5" /> <strong>Continue Mode:</strong> You can practice all selected rounds regardless of score.</p>
                    )}
                  </>
                ) : (
                  <p className="flex items-start gap-2"><Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" /> Complete the continuous session. No elimination between categories.</p>
                )}
                <p className="flex items-start gap-2"><Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" /> The AI provides practice feedback; it does not make an actual hiring decision.</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="glass-panel bg-blue-950/40 backdrop-blur-xl border-white/10 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-white">Session Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-blue-100">
                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                  <div className="text-blue-300 mb-1 text-xs uppercase tracking-wider font-semibold">Target Role</div>
                  <div className="font-semibold text-white">{targetRole} at {targetCompany}</div>
                </div>
                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                  <div className="text-blue-300 mb-1 text-xs uppercase tracking-wider font-semibold">Resume</div>
                  <div className="font-semibold text-white">{resumeFileName || 'None uploaded'}</div>
                </div>
                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                  <div className="text-blue-300 mb-1 text-xs uppercase tracking-wider font-semibold">Language & Voice</div>
                  <div className="font-semibold text-white">{language} • {voiceProfile}</div>
                </div>
                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                  <div className="text-blue-300 mb-1 text-xs uppercase tracking-wider font-semibold">Mode</div>
                  <div className="font-semibold text-white">
                    {interviewMode} {interviewMode === 'Structured' ? `(${evaluationMode})` : ''}
                  </div>
                </div>
                {interviewMode === 'Structured' && (
                  <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                    <div className="text-blue-300 mb-1 text-xs uppercase tracking-wider font-semibold">Selected Rounds</div>
                    <div className="font-semibold text-white">
                      {structuredRounds.map(r => r.type).join(' → ')}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-auto flex justify-between items-center bg-blue-950/60 backdrop-blur-xl border border-white/10 p-6 rounded-xl shadow-2xl">
          <BackButton onClick={() => setStage(interviewMode === 'Structured' ? 'round_selection' : 'configuration')} />
          <div className="text-sm text-blue-200 font-medium">Final Check</div>
          <Button onClick={handleStart} size="lg" disabled={!isReady} className="gap-2 font-bold bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/20 border-0">
            Start Interview <Play className="w-4 h-4 fill-current" />
          </Button>
        </div>
      </div>
    </SetupLayout>
  );
}
