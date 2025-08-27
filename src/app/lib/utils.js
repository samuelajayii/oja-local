import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}


export function getInitials(name) {
        if (!name) return "";

        return name
            .split(" ")              // split into words
            .map(word => word[0])    // take first letter of each word
            .join("")                // join them
            .toUpperCase();          // make uppercase
    }