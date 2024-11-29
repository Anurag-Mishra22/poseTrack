import { create } from "zustand";

export const useSquat = create((set) => ({
  stageS: "down", // Initialize squat stage as 'down'
  squatCount: 0, // To track the number of squats completed
  setStageS: (newStage: string) => {
    // console.log("setStageS called with:", newStage);
    set((state: any) => {
      if (state.stageS === "down" && newStage === "up") {
        // Transition from down to up stage
        return { stageS: "up" };
      } else if (state.stageS === "up" && newStage === "down") {
        // Transition from up to down stage
        return { stageS: "down", squatCount: state.squatCount + 1 }; // Increment squat count
      }
      return state; // No change if in the same state
    });
  },
  resetSquatCount: () => set({ squatCount: 0 }), // Function to reset squat count
}));
