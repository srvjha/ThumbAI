import axios from "axios";

export const deductCredits = async (userId: string) => {
  try {
    const response = await axios.patch("/api/user/update", { userId });
    if (response.data.success) {
      console.log("Credits: ", response.data.message);
      return response.data.success;
    }
    return false;
  } catch (error: any) {
    console.log("Error occurred while deducting credits", error.message);
  }
};
