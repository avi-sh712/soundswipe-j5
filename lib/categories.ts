export interface Category {
  value: string;
  label: string;
}

// "All" maps to the personalized feed (recommendations once the user has likes).
export const CATEGORIES: Category[] = [
  { value: "All", label: "For You" },
  { value: "UI", label: "UI & Interactions" },
  { value: "Combat", label: "Combat" },
  { value: "Impact", label: "Impacts & Hits" },
  { value: "Ambience", label: "Ambience" },
];

// Categories selectable when uploading (excludes the "All" feed alias).
export const UPLOAD_CATEGORIES: Category[] = CATEGORIES.filter(
  (c) => c.value !== "All",
);
