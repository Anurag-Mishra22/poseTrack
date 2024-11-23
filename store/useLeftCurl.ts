import { create } from "zustand";

export const useLeftCurl = create((set) => ({
  stageL: "down",
  setStageL: (newStage: string) => {
    console.log("setStageL called with:", newStage);
    set((state: any) => {
      if (state.stageL === "down") {
        return { stageL: "up" };
      } else if (state.stageL === "up") {
        return { stageL: "down" };
      }
    });
  },
}));
