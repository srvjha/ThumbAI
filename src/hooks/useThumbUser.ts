import { useState, useEffect } from "react";
import axios from "axios";

enum Plan {
  FREE = "FREE",
  PAID = "PAID",
}

interface User {
  id: string;
  email: string;
  credits: number;
  plan: Plan;
}

export const useThumbUser = () => {
  const [data, setData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserInfo = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("/api/user");
      if (response.data.success) {
        setData(response.data.data);
        setError(null);
      } else {
        setError("Failed to fetch user info");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserInfo();
  }, []);

  return { data, setData, isLoading, error, refetch: fetchUserInfo };
};
