"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Brain, Clock, RefreshCw, Zap } from "lucide-react";
import { useEffect, useState } from "react";

interface AnalysisInProgressProps {
  owner: string;
  repoName: string;
  onAnalysisComplete?: () => void;
}

export default function AnalysisInProgress({ owner, repoName, onAnalysisComplete }: AnalysisInProgressProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("Initializing analysis...");
  const [pollCount, setPollCount] = useState(0);
  const [pollInterval, setPollInterval] = useState(2000); // Start with 2 seconds

  useEffect(() => {
    const steps = [
      "Fetching repository data from GitHub...",
      "Analyzing repository structure...", 
      "Generating AI-powered insights...",
      "Finding alternative projects...",
      "Finalizing analysis...",
    ];
    // Simulate progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = Math.min(prev + 1, 95); // Don't reach 100% until actually complete
        const stepIndex = Math.floor((newProgress / 100) * steps.length);
        setCurrentStep(steps[stepIndex] || steps[steps.length - 1]);
        return newProgress;
      });
    }, 200);    // Poll for analysis completion with progressive backoff
    const createPollInterval = () => {
      return setInterval(async () => {
        try {
          setPollCount(prev => {
            const newCount = prev + 1;
            // Progressive backoff: 2s -> 3s -> 5s -> 8s -> 10s (max)
            if (newCount <= 3) {
              setPollInterval(2000); // 2 seconds for first 3 attempts
            } else if (newCount <= 6) {
              setPollInterval(3000); // 3 seconds for next 3 attempts  
            } else if (newCount <= 10) {
              setPollInterval(5000); // 5 seconds for next 4 attempts
            } else if (newCount <= 15) {
              setPollInterval(8000); // 8 seconds for next 5 attempts
            } else {
              setPollInterval(10000); // 10 seconds thereafter
            }
            return newCount;
          });
          
          const response = await fetch(`/api/analysis-status?owner=${owner}&repo=${repoName}`);
          const status = await response.json();
          
          if (status.exists && status.hasAnalysis) {
            clearInterval(progressInterval);
            clearInterval(currentPollInterval);
            setProgress(100);
            setCurrentStep("Analysis complete! Loading results...");
            
            // Wait a moment to show completion before calling the callback
            setTimeout(() => {
              onAnalysisComplete?.();
            }, 1500);
          }
        } catch (error) {
          console.error('Error polling analysis status:', error);
        }
      }, pollInterval);
    };

    let currentPollInterval = createPollInterval();

    // Update poll interval when it changes
    const intervalUpdater = setInterval(() => {
      clearInterval(currentPollInterval);
      currentPollInterval = createPollInterval();
    }, pollInterval);    // Cleanup after 5 minutes
    const timeout = setTimeout(() => {
      clearInterval(progressInterval);
      clearInterval(currentPollInterval);
      clearInterval(intervalUpdater);
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(currentPollInterval);
      clearInterval(intervalUpdater);
      clearTimeout(timeout);
    };
  }, [owner, repoName, onAnalysisComplete]);

  return (
    <div className="container mx-auto p-4 md:p-8 flex justify-center items-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Brain className="h-12 w-12 text-primary animate-pulse" />
              <Zap className="absolute -top-1 -right-1 h-6 w-6 text-yellow-500 animate-bounce" />
            </div>
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <Clock className="h-5 w-5" />
            Analyzing Repository
          </CardTitle>          <CardDescription>
            We&apos;re analyzing <span className="font-semibold">{owner}/{repoName}</span> and generating insights for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
            <div className="text-sm text-muted-foreground text-center min-h-[20px] transition-all duration-300">
            {currentStep}
          </div>          <div className="text-xs text-muted-foreground text-center">
            {pollCount <= 5 
              ? "This usually takes 10-30 seconds. Please don't refresh the page."
              : pollCount <= 10
              ? "Analysis is taking a bit longer than usual, but still processing..."
              : pollCount <= 15
              ? "Complex repository - analysis is still in progress..."
              : "Analysis is taking longer than expected but hasn't failed yet."
            }
          </div>
          
          {pollCount > 6 && pollCount <= 12 && (
            <div className="text-xs text-amber-600 text-center animate-pulse">
              Taking longer than expected... The AI analysis is still processing.
            </div>
          )}
          
          {pollCount > 12 && pollCount <= 18 && (
            <div className="text-xs text-orange-600 text-center animate-pulse">
              This is a complex analysis. Please be patient while we finish.
            </div>
          )}          {pollCount > 18 && (
            <div className="text-xs text-red-600 text-center">
              This is taking much longer than usual. The analysis may be experiencing issues.
            </div>
          )}
          
          {pollCount > 20 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.reload()}
              className="mt-2 w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
