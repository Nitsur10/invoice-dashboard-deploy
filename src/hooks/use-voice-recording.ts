'use client';

import { useState, useRef, useCallback } from 'react';

export type RecordingState = 'idle' | 'recording' | 'transcribing' | 'error';

interface UseVoiceRecordingReturn {
  state: RecordingState;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  cancelRecording: () => void;
  isSupported: boolean;
  error: string | null;
  recordingDuration: number;
}

const MAX_RECORDING_TIME = 120000; // 2 minutes in milliseconds

export function useVoiceRecording(): UseVoiceRecordingReturn {
  const [state, setState] = useState<RecordingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Check if MediaRecorder is supported
  const isSupported = typeof window !== 'undefined' && 
                      'MediaRecorder' in window && 
                      'mediaDevices' in navigator;
  
  const cleanup = useCallback(() => {
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clear timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    
    // Reset recorder
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setRecordingDuration(0);
  }, []);
  
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Voice recording is not supported in your browser');
      setState('error');
      return;
    }
    
    if (state === 'recording') {
      return; // Already recording
    }
    
    try {
      setError(null);
      setState('recording');
      audioChunksRef.current = [];
      setRecordingDuration(0);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      
      streamRef.current = stream;
      
      // Determine the best MIME type for the browser
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('Total chunks collected:', audioChunksRef.current.length);
        }
      };
      
      mediaRecorder.onerror = (event: Event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording failed. Please try again.');
        setState('error');
        cleanup();
      };
      
      // Start recording
      console.log('Starting MediaRecorder with mimeType:', mimeType);
      mediaRecorder.start(1000); // Collect data every 1 second (more reliable)
      
      // Start duration timer
      let duration = 0;
      durationTimerRef.current = setInterval(() => {
        duration += 100;
        setRecordingDuration(duration);
      }, 100);
      
      // Auto-stop after max recording time
      timerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRecording();
        }
      }, MAX_RECORDING_TIME);
      
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      
      let errorMessage = 'Failed to access microphone';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Microphone permission denied. Please allow microphone access to use voice input.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = 'Microphone is already in use by another application.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Unable to find a microphone that meets requirements.';
      } else if (err.name === 'SecurityError') {
        errorMessage = 'Microphone access blocked. Please use HTTPS.';
      }
      
      setError(errorMessage);
      setState('error');
      cleanup();
    }
  }, [isSupported, state, cleanup]);
  
  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (!mediaRecorderRef.current || state !== 'recording') {
      console.log('Stop called but not recording:', { hasRecorder: !!mediaRecorderRef.current, state });
      return null;
    }
    
    return new Promise((resolve, reject) => {
      const recorder = mediaRecorderRef.current;
      
      if (!recorder) {
        resolve(null);
        return;
      }
      
      // Set timeout in case stop never fires
      const timeout = setTimeout(() => {
        console.error('Recording stop timeout - forcing cleanup');
        cleanup();
        setState('idle');
        reject(new Error('Recording stop timeout'));
      }, 5000);
      
      recorder.onstop = () => {
        clearTimeout(timeout);
        
        console.log('Recording stopped, chunks:', audioChunksRef.current.length);
        
        if (audioChunksRef.current.length === 0) {
          console.error('No audio chunks captured');
          cleanup();
          setState('idle');
          resolve(null);
          return;
        }
        
        try {
          const mimeType = recorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          
          console.log('Audio blob created:', { size: audioBlob.size, type: audioBlob.type });
          
          cleanup();
          setState('idle');
          resolve(audioBlob);
        } catch (error) {
          console.error('Error creating audio blob:', error);
          cleanup();
          setState('idle');
          reject(error);
        }
      };
      
      recorder.onerror = (event) => {
        clearTimeout(timeout);
        console.error('Recorder error during stop:', event);
        cleanup();
        setState('idle');
        reject(new Error('Recording error'));
      };
      
      // Stop recording
      try {
        if (recorder.state === 'recording' || recorder.state === 'paused') {
          console.log('Stopping recorder, current state:', recorder.state);
          recorder.stop();
        } else {
          clearTimeout(timeout);
          console.warn('Recorder not in recording state:', recorder.state);
          cleanup();
          setState('idle');
          resolve(null);
        }
      } catch (error) {
        clearTimeout(timeout);
        console.error('Error stopping recorder:', error);
        cleanup();
        setState('idle');
        reject(error);
      }
    });
  }, [state, cleanup]);
  
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    cleanup();
    setState('idle');
    setError(null);
  }, [cleanup]);
  
  return {
    state,
    startRecording,
    stopRecording,
    cancelRecording,
    isSupported,
    error,
    recordingDuration,
  };
}

