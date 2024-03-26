import { useEffect, useState } from "react";

export const useCounter = () => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      if (count < 100) {
        setCount((prevCount) => prevCount + 25);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [count]);
  return count;
}

