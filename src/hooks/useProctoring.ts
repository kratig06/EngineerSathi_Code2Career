import { useEffect } from 'react';
import { useInterviewStore } from '@/store/interviewStore';

export function useProctoring(endInterviewFlow: () => void, videoStream: MediaStream | null) {
  const { addWarning, warnings, isPaused, setPaused } = useInterviewStore();

  useEffect(() => {
    if (isPaused) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        addWarning('tab_switch', 'You navigated away from the interview tab.');
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        addWarning('fullscreen_exit', 'You exited full-screen mode.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [addWarning, isPaused]);

  useEffect(() => {
    if (!videoStream || isPaused) return;
    
    const videoTracks = videoStream.getVideoTracks();
    const audioTracks = videoStream.getAudioTracks();

    const handleTrackEnded = (type: string) => {
      addWarning('device_disconnected', `Your ${type} was disconnected or stopped working.`);
      setPaused(true, `${type} disconnected`);
    };

    videoTracks.forEach(track => {
      track.addEventListener('ended', () => handleTrackEnded('camera'));
    });
    audioTracks.forEach(track => {
      track.addEventListener('ended', () => handleTrackEnded('microphone'));
    });

    return () => {
      videoTracks.forEach(track => {
        track.removeEventListener('ended', () => handleTrackEnded('camera'));
      });
      audioTracks.forEach(track => {
        track.removeEventListener('ended', () => handleTrackEnded('microphone'));
      });
    };
  }, [videoStream, addWarning, isPaused, setPaused]);

  // Handle warning policy
  useEffect(() => {
    const totalWarnings = warnings.length;
    if (totalWarnings === 4 && !isPaused) {
      setPaused(true, 'warning_threshold');
    } else if (totalWarnings >= 5) {
      endInterviewFlow();
    }
  }, [warnings, isPaused, setPaused, endInterviewFlow]);
}
