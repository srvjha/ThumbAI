import axios from "axios";

export const deductCredits = async (userId: string,credits:number) => {
  try {
    const response = await axios.patch("/api/user/update", { userId ,credits});
    if (response.data.success) {
      console.log("Credits: ", response.data.message);
      return response.data.success;
    }
    return false;
  } catch (error: any) {
    console.log("Error occurred while deducting credits", error.message);
  }
};
