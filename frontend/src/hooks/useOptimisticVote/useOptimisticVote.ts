import { useEffect, useRef, useState } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";

export interface UseOptimisticVoteProps {
  postId?: string;
  itemId?: string;
  initialScore: number;
  initialUserVote: number;
  onVoteChange?: (id: string, newScore: number, newUserVote: number) => void;
  voteFn?: (
    id: string,
    value: number,
  ) => Promise<{ score: number; userVote: number }>;
}

export const useOptimisticVote = ({
  postId,
  itemId,
  initialScore,
  initialUserVote,
  onVoteChange,
  voteFn,
}: UseOptimisticVoteProps) => {
  const targetId = (itemId || postId) as string;
  const { user } = useAuth();
  const [score, setScore] = useState(initialScore);
  const [userVote, setUserVote] = useState(initialUserVote);

  // Confirmed server state
  const serverStateRef = useRef({
    score: initialScore,
    userVote: initialUserVote,
  });

  // Current local target vote
  const targetVoteRef = useRef(initialUserVote);

  // Request counter to avoid race conditions
  const requestIdRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  // Track target ID to reset state only when viewing a different item
  const lastTargetIdRef = useRef(targetId);
  useEffect(() => {
    if (lastTargetIdRef.current !== targetId) {
      lastTargetIdRef.current = targetId;
      setScore(initialScore);
      setUserVote(initialUserVote);
      serverStateRef.current = {
        score: initialScore,
        userVote: initialUserVote,
      };
      targetVoteRef.current = initialUserVote;
    }
  }, [targetId, initialScore, initialUserVote]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleVote = (e: React.MouseEvent, direction: 1 | -1) => {
    e.stopPropagation();

    if (!user) {
      window.dispatchEvent(new CustomEvent("open-auth-modal"));
      return;
    }

    const currentVote = targetVoteRef.current;
    const newVote = currentVote === direction ? 0 : direction;
    const scoreDiff = newVote - currentVote;

    // 1. Instant synchronous UI update
    targetVoteRef.current = newVote;
    setUserVote(newVote);
    setScore((prev) => prev + scoreDiff);

    // 2. Debounced network dispatch
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(async () => {
      const voteToSend = targetVoteRef.current;

      // Skip request if user toggled back to already confirmed server vote
      if (voteToSend === serverStateRef.current.userVote) {
        return;
      }

      const currentReqId = ++requestIdRef.current;

      try {
        const res = voteFn
          ? await voteFn(targetId, voteToSend)
          : await api.posts.vote(targetId, voteToSend);

        // If a newer vote action was triggered while this request was in-flight, ignore response
        if (currentReqId !== requestIdRef.current) {
          return;
        }

        serverStateRef.current = {
          score: res.score,
          userVote: res.userVote,
        };

        // If local target vote is still the same, sync server numbers
        if (targetVoteRef.current === voteToSend) {
          setScore(res.score);
          setUserVote(res.userVote);
          onVoteChange?.(targetId, res.score, res.userVote);
        }
      } catch {
        // Ignore errors from outdated requests
        if (currentReqId !== requestIdRef.current) {
          return;
        }

        // Rollback to last confirmed server state
        targetVoteRef.current = serverStateRef.current.userVote;
        setUserVote(serverStateRef.current.userVote);
        setScore(serverStateRef.current.score);
        onVoteChange?.(
          targetId,
          serverStateRef.current.score,
          serverStateRef.current.userVote,
        );
      }
    }, 200);
  };

  return {
    score,
    userVote,
    handleVote,
  };
};
