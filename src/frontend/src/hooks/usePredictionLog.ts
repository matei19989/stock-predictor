import { useState, useEffect } from 'react';
import * as predictionService from '@/services/predictionService';

export function usePredictionLog() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    predictionService.getUserPredictionCount()
      .then(setCount)
      .catch(() => {});
  }, []);

  return { count };
}
